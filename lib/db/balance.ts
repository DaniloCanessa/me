import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Balance anual / Pre-balance (Fase D) ────────────────────────────────────
// Consolida el año desde el RCV del SII (ingresos/costos/IVA), el F29 (PPM) y
// los honorarios, con los saldos de apertura del ejercicio (balance_config).

export type Honorario = {
  id: string; periodo: string; fecha: string; emisor: string | null; rut: string | null;
  folio: string | null; monto_bruto: number; retencion: number; monto_liquido: number; glosa: string | null;
};

export type BalanceConfig = {
  anio: number;
  capital_social: number;
  aportes_socio: number;
  perdida_acumulada_anterior: number;
  caja_inicial: number;
  notas: string | null;
};

export type BalanceMes = {
  periodo: string;
  ventasNeto: number; comprasNeto: number; honorarios: number;
  ivaDebito: number; ivaCredito: number; resultado: number;
};

export type BalanceAnual = {
  anio: number;
  config: BalanceConfig;
  meses: BalanceMes[];
  // Acumulados del ejercicio
  ingresos: number;        // ventas del giro (neto)
  costos: number;          // compras del giro (neto)
  honorarios: number;      // gastos por honorarios (bruto)
  resultadoEjercicio: number;
  activoFijo: number;      // facturas marcadas como activo fijo (neto)
  ivaDebito: number;
  ivaCredito: number;
  ppm: number;             // PPM del año (F29 062)
  retencionHonorarios: number;
  // Patrimonio
  patrimonioFinal: number; // capital + aportes − pérdida acum − pérdida ejercicio
  // Desglose por clasificación de las facturas de compra registradas
  clasificacion: ClasificacionCompras;
};

// Cómo se reparten las compras del año según la cuenta que se les asignó.
// El total de compras sigue saliendo del RCV del SII (fuente autoritativa);
// esta clasificación es la que dice CÓMO se reparten en el balance.
export type ClasificacionCompras = {
  costoGiro: number;        // neto → Costo de ventas
  gastoAdmin: number;       // neto → Gastos de administración
  activoFijo: number;       // neto → Activo fijo (no es gasto)
  sinClasificar: number;    // neto de facturas sin cuenta asignada
  porCuenta: Array<{ cuenta: string; grupo: string; neto: number; docs: number }>;
  totalRegistrado: number;  // suma de todo lo anterior
};

const DEFAULT_CONFIG = (anio: number): BalanceConfig => ({
  anio, capital_social: 0, aportes_socio: 0, perdida_acumulada_anterior: 0, caja_inicial: 0, notas: null,
});

export async function getBalanceConfig(anio: number): Promise<BalanceConfig> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('balance_config').select('*').eq('anio', anio).maybeSingle();
  if (!data) return DEFAULT_CONFIG(anio);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    anio, capital_social: d.capital_social ?? 0, aportes_socio: d.aportes_socio ?? 0,
    perdida_acumulada_anterior: d.perdida_acumulada_anterior ?? 0, caja_inicial: d.caja_inicial ?? 0,
    notas: d.notas ?? null,
  };
}

export async function getHonorarios(anio: number): Promise<Honorario[]> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('honorarios').select('*')
    .gte('periodo', `${anio}-01`).lte('periodo', `${anio}-12`)
    .order('fecha', { ascending: false });
  return (data ?? []) as Honorario[];
}

export async function getBalanceAnual(anio: number): Promise<BalanceAnual> {
  const db = getSupabaseAdmin();
  const desde = `${anio}-01`, hasta = `${anio}-12`;

  const [config, compras, ventas, hon, f29, clasificadas] = await Promise.all([
    getBalanceConfig(anio),
    db.from('sii_rcv_compras').select('periodo, monto_neto, monto_iva').gte('periodo', desde).lte('periodo', hasta),
    db.from('sii_rcv_ventas').select('periodo, monto_neto, monto_iva').gte('periodo', desde).lte('periodo', hasta),
    getHonorarios(anio),
    db.from('f29_periods').select('periodo, ppm_neto, retencion_honorarios').gte('periodo', desde).lte('periodo', hasta),
    // Facturas de compra registradas con su cuenta: de aquí sale el desglose
    // entre costo del giro, gasto de administración y activo fijo.
    db.from('expense_captures')
      .select('neto, total, con_iva, fecha, tipo, purchase_accounts(nombre, grupo)')
      .eq('status', 'aprobado').gte('fecha', desde + '-01').lte('fecha', hasta + '-31'),
  ]);

  // Acumular por mes
  const meses = new Map<string, BalanceMes>();
  const bucket = (p: string): BalanceMes => {
    if (!meses.has(p)) meses.set(p, { periodo: p, ventasNeto: 0, comprasNeto: 0, honorarios: 0, ivaDebito: 0, ivaCredito: 0, resultado: 0 });
    return meses.get(p)!;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (compras.data ?? []) as any[]) { const b = bucket(c.periodo); b.comprasNeto += Number(c.monto_neto) || 0; b.ivaCredito += Number(c.monto_iva) || 0; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of (ventas.data ?? []) as any[]) { const b = bucket(v.periodo); b.ventasNeto += Number(v.monto_neto) || 0; b.ivaDebito += Number(v.monto_iva) || 0; }
  for (const h of hon) { const b = bucket(h.periodo); b.honorarios += Number(h.monto_bruto) || 0; }
  for (const b of meses.values()) b.resultado = b.ventasNeto - b.comprasNeto - b.honorarios;

  const mesesArr = [...meses.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));

  // Desglose de las compras por la cuenta que se les asignó.
  const clasif: ClasificacionCompras = {
    costoGiro: 0, gastoAdmin: 0, activoFijo: 0, sinClasificar: 0,
    porCuenta: [], totalRegistrado: 0,
  };
  const porCuenta = new Map<string, { cuenta: string; grupo: string; neto: number; docs: number }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((clasificadas.data ?? []) as any[])) {
    const netoBruto = r.neto != null
      ? Number(r.neto)
      : (r.con_iva ? Math.round((Number(r.total) || 0) / 1.19) : Number(r.total) || 0);
    // Las notas de crédito recibidas rebajan el gasto de su misma cuenta.
    const neto = (r.tipo === 'nota_credito' ? -1 : 1) * (netoBruto || 0);

    const cuenta = r.purchase_accounts as { nombre: string; grupo: string } | null;
    if (!cuenta) {
      clasif.sinClasificar += neto;
    } else if (cuenta.grupo === 'activo_fijo') {
      clasif.activoFijo += neto;
    } else if (cuenta.grupo === 'gasto_admin') {
      clasif.gastoAdmin += neto;
    } else {
      clasif.costoGiro += neto;
    }

    const key = cuenta?.nombre ?? 'Sin clasificar';
    const cur = porCuenta.get(key) ?? { cuenta: key, grupo: cuenta?.grupo ?? 'sin_clasificar', neto: 0, docs: 0 };
    cur.neto += neto; cur.docs += 1;
    porCuenta.set(key, cur);
  }
  clasif.porCuenta = [...porCuenta.values()].sort((a, b) => b.neto - a.neto);
  clasif.totalRegistrado = clasif.costoGiro + clasif.gastoAdmin + clasif.activoFijo + clasif.sinClasificar;

  // El activo fijo no es gasto: se descuenta de los costos del giro.
  const activoFijo = clasif.activoFijo;

  const ingresos = mesesArr.reduce((s, m) => s + m.ventasNeto, 0);
  const costos = mesesArr.reduce((s, m) => s + m.comprasNeto, 0) - activoFijo;
  const honorarios = mesesArr.reduce((s, m) => s + m.honorarios, 0);
  const ivaDebito = mesesArr.reduce((s, m) => s + m.ivaDebito, 0);
  const ivaCredito = mesesArr.reduce((s, m) => s + m.ivaCredito, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ppm = ((f29.data ?? []) as any[]).reduce((s, r) => s + (Number(r.ppm_neto) || 0), 0);
  const retencionHonorarios = hon.reduce((s, h) => s + (Number(h.retencion) || 0), 0);

  const resultadoEjercicio = ingresos - costos - honorarios;
  const patrimonioFinal = config.capital_social + config.aportes_socio
    - config.perdida_acumulada_anterior + resultadoEjercicio;

  return {
    anio, config, meses: mesesArr,
    ingresos, costos, honorarios, resultadoEjercicio, activoFijo,
    ivaDebito, ivaCredito, ppm, retencionHonorarios,
    patrimonioFinal,
    clasificacion: clasif,
  };
}
