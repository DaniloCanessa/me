import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Simulaciones guardadas ──────────────────────────────────────────────────
// Una instalación puede tener muchas simulaciones. Cada una registra CUÁNDO se
// hizo (con hora, porque una misma boleta puede reabrirse varias veces el mismo
// día) y DE QUÉ BOLETA salió, para poder distinguirlas y detectar repeticiones.

export type SimulationRow = {
  id: string;
  client_id: string;
  installation_id: string | null;
  fecha_simulacion: string;
  fecha_boleta: string | null;
  numero_boleta: string | null;
  direccion: string | null;
  comuna: string | null;
  region_id: string | null;
  customer_type: 'natural' | 'business';
  escenario: string | null;
  kit_size_kwp: number | null;
  panel_count: number | null;
  system_cost_clp: number | null;
  battery_kwh: number;
  annual_benefit_clp: number | null;
  payback_years: number | null;
  bill_savings_percent: number | null;
  average_monthly_kwh: number | null;
  input_json: unknown;
  result_json: unknown;
  quote_id: string | null;
  corrige_id: string | null;
  notas: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  installation_nombre?: string | null;
  client_nombre?: string | null;
  bills?: SimulationBill[];
};

export type SimulationBill = {
  id: string;
  simulation_id: string | null;
  client_id: string;
  installation_id: string | null;
  file_path: string;
  file_name: string | null;
  content_type: string | null;
  fecha_boleta: string | null;
  numero_boleta: string | null;
  distribuidora: string | null;
  created_at: string;
};

// ─── Lecturas ────────────────────────────────────────────────────────────────

export async function getClientSimulations(clientId: string): Promise<SimulationRow[]> {
  const db = getSupabaseAdmin();
  const [{ data: sims }, { data: bills }] = await Promise.all([
    db.from('simulations')
      .select('*, installations(nombre_instalacion)')
      .eq('client_id', clientId)
      .order('fecha_simulacion', { ascending: false }),
    db.from('simulation_bills').select('*').eq('client_id', clientId),
  ]);

  const porSim = new Map<string, SimulationBill[]>();
  for (const b of ((bills ?? []) as SimulationBill[])) {
    if (!b.simulation_id) continue;
    const list = porSim.get(b.simulation_id) ?? [];
    list.push(b);
    porSim.set(b.simulation_id, list);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((sims ?? []) as any[]).map((r) => ({
    ...r,
    installation_nombre: r.installations?.nombre_instalacion ?? null,
    bills: porSim.get(r.id) ?? [],
  }));
}

export async function getSimulation(id: string): Promise<SimulationRow | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('simulations')
    .select('*, installations(nombre_instalacion), clients(nombre)')
    .eq('id', id)
    .single();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const { data: bills } = await db.from('simulation_bills').select('*').eq('simulation_id', id);
  return {
    ...r,
    installation_nombre: r.installations?.nombre_instalacion ?? null,
    client_nombre: r.clients?.nombre ?? null,
    bills: (bills ?? []) as SimulationBill[],
  };
}

// ─── Detección de boleta ya simulada ─────────────────────────────────────────
//
// Antes de guardar se avisa si esa misma boleta ya se simuló, para no acumular
// simulaciones duplicadas del mismo período sin darse cuenta. Se busca por
// número de documento (lo más confiable) y, si no hay número, por la fecha del
// período dentro de la misma instalación.

export type SimulacionPrevia = {
  id: string;
  fecha_simulacion: string;
  fecha_boleta: string | null;
  numero_boleta: string | null;
  kit_size_kwp: number | null;
  annual_benefit_clp: number | null;
  motivo: 'numero' | 'fecha';
};

export async function findSimulacionDeLaMismaBoleta(opts: {
  clientId: string;
  installationId?: string | null;
  fechaBoleta?: string | null;
  numeroBoleta?: string | null;
}): Promise<SimulacionPrevia | null> {
  const { clientId, installationId, fechaBoleta, numeroBoleta } = opts;
  if (!numeroBoleta && !fechaBoleta) return null;

  const db = getSupabaseAdmin();
  const { data } = await db
    .from('simulations')
    .select('id, fecha_simulacion, fecha_boleta, numero_boleta, kit_size_kwp, annual_benefit_clp, installation_id')
    .eq('client_id', clientId)
    .order('fecha_simulacion', { ascending: false })
    .limit(100);

  const filas = (data ?? []) as Array<SimulacionPrevia & { installation_id: string | null }>;

  // 1) Mismo número de documento: es literalmente la misma boleta.
  if (numeroBoleta) {
    const norm = (s: string | null) => (s ?? '').replace(/\s/g, '').replace(/^0+/, '');
    const porNumero = filas.find((f) => f.numero_boleta && norm(f.numero_boleta) === norm(numeroBoleta));
    if (porNumero) return { ...porNumero, motivo: 'numero' };
  }

  // 2) Mismo período en la misma instalación: casi seguro es la misma boleta
  //    aunque el OCR no haya podido leer el número.
  if (fechaBoleta) {
    const porFecha = filas.find((f) =>
      f.fecha_boleta === fechaBoleta &&
      (!installationId || f.installation_id === installationId));
    if (porFecha) return { ...porFecha, motivo: 'fecha' };
  }

  return null;
}

// ─── Conteo para la ficha del cliente ────────────────────────────────────────

export async function countClientSimulations(clientId: string): Promise<number> {
  const db = getSupabaseAdmin();
  const { count } = await db
    .from('simulations')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);
  return count ?? 0;
}
