import { getSupabaseAdmin } from '@/lib/supabase';
import type { Client, Installation, Activity } from '@/lib/types';

export async function getClients(): Promise<Client[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const db = getSupabaseAdmin();
  const { data: client } = await db
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  if (!client) return null;

  const [{ data: installations }, { data: contacts }] = await Promise.all([
    db.from('installations').select('*').eq('client_id', id).order('created_at'),
    db.from('client_contacts').select('*').eq('client_id', id).order('es_principal', { ascending: false }),
  ]);

  return {
    ...(client as Client),
    installations: (installations ?? []) as Installation[],
    contacts:      (contacts ?? []) as never,
  };
}

export async function getClientActivities(clientId: string): Promise<Activity[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('activities')
    .select('*')
    .eq('client_id', clientId)
    .order('fecha', { ascending: false });
  return (data ?? []) as Activity[];
}

// ─── Clientes para el simulador del back-office ──────────────────────────────
// Trae cada cliente con sus instalaciones, que es de donde sale el prellenado
// del wizard (región, comuna, distribuidora, tarifa, amperaje, consumo).

export type SimulatorClientOption = {
  id: string;
  nombre: string;
  empresa: string | null;
  atencion_a: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  installations: Array<{
    id: string;
    nombre_instalacion: string;
    direccion: string | null;
    comuna: string | null;
    ciudad: string | null;
    region_id: string | null;
    customer_type: 'natural' | 'business' | null;
    distribuidora: string | null;
    tarifa: string | null;
    amperaje_a: number | null;
    potencia_contratada_kw: number | null;
    tension_suministro: 'BT' | 'AT' | null;
    consumo_promedio_mensual_kwh: number | null;
  }>;
  /** Resumen de sus simulaciones guardadas, para ofrecer retomar una. */
  simulations: Array<{
    id: string;
    fecha_simulacion: string;
    fecha_boleta: string | null;
    kit_size_kwp: number | null;
    battery_kwh: number;
    annual_benefit_clp: number | null;
    installation_id: string | null;
  }>;
};

export async function getClientsForSimulator(): Promise<SimulatorClientOption[]> {
  const db = getSupabaseAdmin();
  const [{ data: clients }, { data: installations }, { data: sims }] = await Promise.all([
    db.from('clients').select('id, nombre, empresa, atencion_a, email, telefono, ciudad').order('nombre'),
    db.from('installations')
      .select('id, client_id, nombre_instalacion, direccion, comuna, ciudad, region_id, customer_type, distribuidora, tarifa, amperaje_a, potencia_contratada_kw, tension_suministro, consumo_promedio_mensual_kwh')
      .eq('is_active', true)
      .order('created_at'),
    db.from('simulations')
      .select('id, client_id, fecha_simulacion, fecha_boleta, kit_size_kwp, battery_kwh, annual_benefit_clp, installation_id')
      .order('fecha_simulacion', { ascending: false }),
  ]);

  const simsPorCliente = new Map<string, SimulatorClientOption['simulations']>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of ((sims ?? []) as any[])) {
    const list = simsPorCliente.get(s.client_id) ?? [];
    list.push(s);
    simsPorCliente.set(s.client_id, list);
  }

  const porCliente = new Map<string, SimulatorClientOption['installations']>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const i of ((installations ?? []) as any[])) {
    const list = porCliente.get(i.client_id) ?? [];
    list.push(i);
    porCliente.set(i.client_id, list);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((clients ?? []) as any[]).map((c) => ({
    ...c,
    installations: porCliente.get(c.id) ?? [],
    simulations:   simsPorCliente.get(c.id) ?? [],
  }));
}
