import { getSupabaseAdmin } from '@/lib/supabase';

// Módulo de Finanzas — Estado de Resultados en BASE CAJA:
//   Ventas (cobrado)  −  Gastos de proyectos  −  Gastos generales  =  Resultado
// Las ventas son los pagos recibidos de clientes (plata real en caja).
// Cada monto se entrega en dos bases: con IVA (tal cual entra/sale) y neto.

const IVA = 1.19;
const r = (n: number) => Math.round(n);

export type Monto = { conIva: number; neto: number };

export type FinanzasResumen = {
  ventas: Monto;
  gastosProyectos: Monto;
  gastosGenerales: Monto;
  resultado: Monto;
  generalesPorCategoria: Array<{ categoria: string } & Monto>;
};

// Para una compra/costo/gasto: a partir del monto guardado y si ya incluye IVA,
// devuelve el par {conIva, neto}.
function split(monto: number, yaConIva: boolean): Monto {
  return yaConIva
    ? { conIva: monto, neto: r(monto / IVA) }
    : { conIva: r(monto * IVA), neto: monto };
}

export async function getFinanzas(desde: string, hasta: string): Promise<FinanzasResumen> {
  const db = getSupabaseAdmin();
  const hastaFin = `${hasta}T23:59:59`;

  const [pays, purchases, costs, generales] = await Promise.all([
    db.from('project_payments').select('monto_clp, fecha').gte('fecha', desde).lte('fecha', hasta),
    db.from('project_purchases').select('monto_clp, con_iva, fecha').gte('fecha', desde).lte('fecha', hasta),
    db.from('project_costs').select('monto_clp, con_iva, created_at').gte('created_at', desde).lte('created_at', hastaFin),
    db.from('expense_captures').select('total, con_iva, categoria, fecha')
      .eq('status', 'aprobado').eq('sin_proyecto', true)
      .gte('fecha', desde).lte('fecha', hasta),
  ]);

  // ── Ventas: pagos de clientes (con IVA incluido por regla del negocio) ──
  let ventasConIva = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (pays.data ?? []) as any[]) ventasConIva += p.monto_clp ?? 0;
  const ventas: Monto = { conIva: ventasConIva, neto: r(ventasConIva / IVA) };

  // ── Gastos de proyectos: compras + costos adicionales ──
  let gpConIva = 0, gpNeto = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const x of (purchases.data ?? []) as any[]) {
    const s = split(x.monto_clp ?? 0, !!x.con_iva);
    gpConIva += s.conIva; gpNeto += s.neto;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (costs.data ?? []) as any[]) {
    const s = split(c.monto_clp ?? 0, c.con_iva === true); // legacy null → neto
    gpConIva += s.conIva; gpNeto += s.neto;
  }
  const gastosProyectos: Monto = { conIva: gpConIva, neto: gpNeto };

  // ── Gastos generales (sin proyecto), por categoría ──
  const catMap = new Map<string, Monto>();
  let ggConIva = 0, ggNeto = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of (generales.data ?? []) as any[]) {
    const s = split(g.total ?? 0, !!g.con_iva);
    ggConIva += s.conIva; ggNeto += s.neto;
    const cat = (g.categoria as string) || 'Sin categoría';
    const cur = catMap.get(cat) ?? { conIva: 0, neto: 0 };
    cur.conIva += s.conIva; cur.neto += s.neto;
    catMap.set(cat, cur);
  }
  const gastosGenerales: Monto = { conIva: ggConIva, neto: ggNeto };

  const generalesPorCategoria = [...catMap.entries()]
    .map(([categoria, m]) => ({ categoria, ...m }))
    .sort((a, b) => b.conIva - a.conIva);

  const resultado: Monto = {
    conIva: ventas.conIva - gastosProyectos.conIva - gastosGenerales.conIva,
    neto:   ventas.neto   - gastosProyectos.neto   - gastosGenerales.neto,
  };

  return { ventas, gastosProyectos, gastosGenerales, resultado, generalesPorCategoria };
}
