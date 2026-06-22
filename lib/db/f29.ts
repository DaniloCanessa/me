import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Planilla F29 mensual (módulo tributario — Fase B) ───────────────────────
// Los renglones CALCULADOS se derivan en vivo de los documentos (facturas de
// venta, compras y gastos con tipo 'factura'); los renglones MANUALES viven en
// f29_periods. Códigos del F29 (SII) anotados en cada campo.
// Base DEVENGADA: todo se imputa por la fecha del documento, no del pago.

const IVA = 1.19;
const r = (n: number) => Math.round(n);

// IVA contenido en un monto según si ya incluye IVA.
function ivaOf(monto: number, yaConIva: boolean): number {
  return yaConIva ? r(monto - monto / IVA) : r(monto * 0.19);
}

const monthRange = (periodo: string) => {
  const [y, m] = periodo.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(last).padStart(2, '0')}` };
};

export type F29Linea = { count: number; iva: number };

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

export type F29Result = {
  periodo: string;
  // Débito fiscal (ventas emitidas del mes)
  debito: {
    facturas: F29Linea;       // 502/503
    boletas: F29Linea;        // 111/110
    notasDebito: F29Linea;    // 513/512
    notasCredito: F29Linea;   // NC emitidas: restan débito
    total: number;            // 538 (IVA)
  };
  // Crédito fiscal (compras/gastos con factura del mes)
  credito: {
    comprasProyecto: F29Linea;  // facturas de compra de proyectos (520)
    gastosGenerales: F29Linea;  // facturas de gasto general (520)
    delMes: number;             // crédito del mes (sin remanente)
    total: number;              // 537 = delMes + remanente anterior (504)
  };
  manual: F29Manual;
  manualExiste: boolean;        // ya hay fila guardada para el mes
  remanenteAnteriorSugerido: number; // 77 del mes previo (si no hay fila)
  // Determinación
  ivaDeterminado: number;       // 89 (a pagar; 0 si hay remanente)
  remanenteSiguiente: number;   // 77 (si crédito > débito)
  totalAPagar: number;          // 91 (+ recargos 94 si los hay)
};

// Solo el lado calculado (débito/crédito del mes), sin remanente ni manuales.
async function getF29Calc(periodo: string) {
  const db = getSupabaseAdmin();
  const { desde, hasta } = monthRange(periodo);

  const [ventas, compras, gastos] = await Promise.all([
    db.from('sales_invoices').select('tipo, iva_clp')
      .eq('estado', 'emitida').gte('fecha_emision', desde).lte('fecha_emision', hasta),
    // Crédito: solo facturas de compra de proyectos (anticipos NO dan crédito)
    db.from('project_purchases').select('monto_clp, con_iva, tipo')
      .eq('tipo', 'factura').gte('fecha', desde).lte('fecha', hasta),
    // Gastos generales aprobados con documento 'factura'
    db.from('expense_captures').select('total, con_iva, tipo')
      .eq('status', 'aprobado').eq('sin_proyecto', true).eq('tipo', 'factura')
      .gte('fecha', desde).lte('fecha', hasta),
  ]);

  const lin = () => ({ count: 0, iva: 0 });
  const facturas = lin(), boletas = lin(), notasDebito = lin(), notasCredito = lin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of (ventas.data ?? []) as any[]) {
    const iva = v.iva_clp || 0;
    const bucket = v.tipo === 'boleta' ? boletas
      : v.tipo === 'nota_debito' ? notasDebito
      : v.tipo === 'nota_credito' ? notasCredito : facturas;
    bucket.count += 1; bucket.iva += iva;
  }
  const debitoTotal = facturas.iva + boletas.iva + notasDebito.iva - notasCredito.iva;

  const comprasProyecto = lin(), gastosGenerales = lin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (compras.data ?? []) as any[]) {
    comprasProyecto.count += 1; comprasProyecto.iva += ivaOf(c.monto_clp || 0, !!c.con_iva);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of (gastos.data ?? []) as any[]) {
    gastosGenerales.count += 1; gastosGenerales.iva += ivaOf(g.total || 0, !!g.con_iva);
  }
  const creditoMes = comprasProyecto.iva + gastosGenerales.iva;

  return { facturas, boletas, notasDebito, notasCredito, debitoTotal, comprasProyecto, gastosGenerales, creditoMes };
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

  // Sugerencia del remanente anterior (504) = remanente siguiente (77) del mes
  // previo, calculado con su crédito + su propio remanente anterior guardado.
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

  return {
    periodo,
    debito: {
      facturas: calc.facturas, boletas: calc.boletas,
      notasDebito: calc.notasDebito, notasCredito: calc.notasCredito,
      total: calc.debitoTotal,
    },
    credito: {
      comprasProyecto: calc.comprasProyecto, gastosGenerales: calc.gastosGenerales,
      delMes: calc.creditoMes, total: creditoTotal,
    },
    manual: { ...manual, remanente_anterior: remanenteAnterior },
    manualExiste,
    remanenteAnteriorSugerido: prevRemanenteSiguiente,
    ivaDeterminado, remanenteSiguiente, totalAPagar,
  };
}
