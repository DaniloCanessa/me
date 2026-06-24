import { getSupabaseAdmin } from '@/lib/supabase';
import { getRcvCreditoIva, getRcvDebitoIva } from '@/lib/db/sii';

// ─── Planilla F29 mensual (módulo tributario) ────────────────────────────────
// El crédito y el débito salen del RCV del SII importado (fuente autoritativa,
// cuadra exacto con el F29). Si aún no se importa el RCV de un mes, se usa como
// respaldo lo registrado en la app: crédito = facturas de la bandeja de gastos
// (tipo factura aprobadas); débito = facturas de venta emitidas. Los renglones
// manuales (remanente anterior, PPM, retenciones…) viven en f29_periods.
// Códigos del F29 (SII) anotados en cada campo. Base devengada (por documento).

const IVA = 1.19;
const r = (n: number) => Math.round(n);
const ivaOf = (monto: number, yaConIva: boolean) => (yaConIva ? r(monto - monto / IVA) : r(monto * 0.19));

const monthRange = (periodo: string) => {
  const [y, m] = periodo.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(last).padStart(2, '0')}` };
};

export type F29Fuente = 'rcv' | 'app';

export type F29Manual = {
  remanente_anterior: number;   // 504
  ppm_base: number;             // 563
  ppm_tasa: number;             // 115
  ppm_neto: number;             // 062
  retencion_honorarios: number; // 151
  otros_impuestos: number;
  reajustes: number;            // 92
  multas: number;               // 93
  notas: string | null;
  revisado: boolean;
};

const DEFAULT_MANUAL: F29Manual = {
  remanente_anterior: 0, ppm_base: 0, ppm_tasa: 0, ppm_neto: 0,
  retencion_honorarios: 0, otros_impuestos: 0, reajustes: 0, multas: 0,
  notas: null, revisado: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type F29Oficial = Record<string, any> | null;

export type RemanenteCheck = {
  esperado: number;   // 77 del mes previo (lo que el SII DEBÍA arrastrar)
  declarado: number;  // 504 que el SII trajo este mes
  ok: boolean;
  dif: number;
} | null;

export type F29Result = {
  periodo: string;
  debito: { iva: number; docs: number; fuente: F29Fuente };   // 538
  credito: { delMes: number; docs: number; fuente: F29Fuente; total: number }; // 520 / 537
  manual: F29Manual;
  manualExiste: boolean;
  remanenteAnteriorSugerido: number; // 77 del mes previo
  ivaDeterminado: number;            // 89
  remanenteSiguiente: number;        // 77
  totalAPagar: number;               // 91
  oficial: F29Oficial;               // F29 declarado al SII (certificado)
  remanenteCheck: RemanenteCheck;    // verificación del arrastre del remanente
};

async function getF29Oficial(periodo: string): Promise<F29Oficial> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('f29_oficial').select('*').eq('periodo', periodo).maybeSingle();
  return data ?? null;
}

// Lado calculado: débito y crédito del mes (RCV-first, respaldo en la app).
async function getF29Calc(periodo: string) {
  const db = getSupabaseAdmin();
  const { desde, hasta } = monthRange(periodo);

  const [rcvCred, rcvDeb, gastos, ventas] = await Promise.all([
    getRcvCreditoIva(periodo),
    getRcvDebitoIva(periodo),
    db.from('expense_captures').select('total, con_iva')
      .eq('status', 'aprobado').eq('tipo', 'factura').gte('fecha', desde).lte('fecha', hasta),
    db.from('sales_invoices').select('iva_clp').eq('estado', 'emitida')
      .gte('fecha_emision', desde).lte('fecha_emision', hasta),
  ]);

  // Crédito: RCV si está importado; si no, facturas de la bandeja de gastos.
  let creditoMes: number, creditoDocs: number, fuenteCredito: F29Fuente;
  if (rcvCred.docs > 0) {
    creditoMes = rcvCred.iva; creditoDocs = rcvCred.docs; fuenteCredito = 'rcv';
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (gastos.data ?? []) as any[];
    creditoMes = g.reduce((s, x) => s + ivaOf(x.total ?? 0, !!x.con_iva), 0);
    creditoDocs = g.length; fuenteCredito = 'app';
  }

  // Débito: RCV ventas si está importado; si no, facturas de venta emitidas.
  let debitoTotal: number, debitoDocs: number, fuenteDebito: F29Fuente;
  if (rcvDeb.docs > 0) {
    debitoTotal = rcvDeb.iva; debitoDocs = rcvDeb.docs; fuenteDebito = 'rcv';
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (ventas.data ?? []) as any[];
    debitoTotal = v.reduce((s, x) => s + (x.iva_clp ?? 0), 0);
    debitoDocs = v.length; fuenteDebito = 'app';
  }

  return { creditoMes, creditoDocs, fuenteCredito, debitoTotal, debitoDocs, fuenteDebito };
}

function prevPeriodo(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getManual(periodo: string): Promise<{ row: F29Manual; exists: boolean }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('f29_periods').select('*').eq('periodo', periodo).maybeSingle();
  if (!data) return { row: { ...DEFAULT_MANUAL }, exists: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    row: {
      remanente_anterior: d.remanente_anterior ?? 0, ppm_base: d.ppm_base ?? 0,
      ppm_tasa: d.ppm_tasa ?? 0, ppm_neto: d.ppm_neto ?? 0,
      retencion_honorarios: d.retencion_honorarios ?? 0, otros_impuestos: d.otros_impuestos ?? 0,
      reajustes: d.reajustes ?? 0, multas: d.multas ?? 0,
      notas: d.notas ?? null, revisado: !!d.revisado,
    },
    exists: true,
  };
}

export async function getF29(periodo: string): Promise<F29Result> {
  const calc = await getF29Calc(periodo);
  const { row: manual, exists: manualExiste } = await getManual(periodo);

  // Remanente anterior sugerido (504) = remanente siguiente (77) del mes previo.
  const prev = prevPeriodo(periodo);
  const [prevCalc, prevManual] = await Promise.all([getF29Calc(prev), getManual(prev)]);
  const prevRemanenteSiguiente = Math.max(
    0, prevCalc.creditoMes + prevManual.row.remanente_anterior - prevCalc.debitoTotal,
  );
  const remanenteAnterior = manualExiste ? manual.remanente_anterior : prevRemanenteSiguiente;

  const creditoTotal = calc.creditoMes + remanenteAnterior;        // 537
  const ivaDeterminado = Math.max(0, calc.debitoTotal - creditoTotal); // 89
  const remanenteSiguiente = Math.max(0, creditoTotal - calc.debitoTotal); // 77

  const totalAPagar = ivaDeterminado
    + manual.ppm_neto + manual.retencion_honorarios + manual.otros_impuestos
    + manual.reajustes + manual.multas;

  // Verificación del remanente: el 504 que el SII declaró este mes debería ser
  // el 77 del mes previo (reajustado). Si no, el SII no lo arrastró → alarma.
  const [oficial, prevOficial] = await Promise.all([getF29Oficial(periodo), getF29Oficial(prev)]);
  let remanenteCheck: RemanenteCheck = null;
  const declarado504 = oficial?.c504_rem_anterior;
  const esperado77 = prevOficial?.c77_rem_siguiente;
  if (declarado504 != null && esperado77 != null) {
    const dif = Number(declarado504) - Number(esperado77);
    // tolerancia por reajuste (IPC mensual): ~3% o $50
    const ok = Math.abs(dif) <= Math.max(50, Number(esperado77) * 0.03);
    remanenteCheck = { esperado: Number(esperado77), declarado: Number(declarado504), ok, dif };
  }

  return {
    periodo,
    debito: { iva: calc.debitoTotal, docs: calc.debitoDocs, fuente: calc.fuenteDebito },
    credito: { delMes: calc.creditoMes, docs: calc.creditoDocs, fuente: calc.fuenteCredito, total: creditoTotal },
    manual: { ...manual, remanente_anterior: remanenteAnterior },
    manualExiste,
    remanenteAnteriorSugerido: prevRemanenteSiguiente,
    ivaDeterminado, remanenteSiguiente, totalAPagar,
    oficial, remanenteCheck,
  };
}
