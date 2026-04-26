import { getSupabaseAdmin } from '@/lib/supabase';

export type ProjectRow = {
  id: string;
  quote_id: string | null;
  client_id: string;
  installation_id: string | null;
  nombre: string;
  estado: 'pendiente' | 'en_ejecucion' | 'completado' | 'cancelado';
  fecha_inicio: string | null;
  fecha_termino: string | null;
  assigned_to: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client_name: string;
  quote_number: string | null;
};

export type ProjectItem = {
  id: string;
  project_id: string;
  quote_item_id: string | null;
  description: string;
  quantity: number;
  unit_price_clp: number;
  costo_proveedor_clp: number;
  discount_percent: number;
  total_clp: number;
  sort_order: number;
};

export type ProjectCost = {
  id: string;
  project_id: string;
  descripcion: string;
  monto_clp: number;
  categoria: string;
  notas: string | null;
  created_at: string;
};

export async function getProjects(): Promise<ProjectRow[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('projects')
    .select(`
      *,
      clients!inner(nombre),
      quotes(quote_number)
    `)
    .order('created_at', { ascending: false });

  return (data ?? []).map((p: Record<string, unknown>) => ({
    ...(p as Omit<ProjectRow, 'client_name' | 'quote_number'>),
    client_name:  (p.clients as { nombre: string })?.nombre ?? '—',
    quote_number: (p.quotes  as { quote_number: string } | null)?.quote_number ?? null,
  }));
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('projects')
    .select(`
      *,
      clients!inner(nombre),
      quotes(quote_number)
    `)
    .eq('id', id)
    .single();

  if (!data) return null;
  const p = data as Record<string, unknown>;
  return {
    ...(p as Omit<ProjectRow, 'client_name' | 'quote_number'>),
    client_name:  (p.clients as { nombre: string })?.nombre ?? '—',
    quote_number: (p.quotes  as { quote_number: string } | null)?.quote_number ?? null,
  };
}

export async function getProjectItems(projectId: string): Promise<ProjectItem[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('project_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');
  return (data ?? []) as ProjectItem[];
}

export async function getProjectCosts(projectId: string): Promise<ProjectCost[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('project_costs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');
  return (data ?? []) as ProjectCost[];
}

export type ProjectPayment = {
  id: string;
  project_id: string;
  monto_clp: number;
  fecha: string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  created_at: string;
};

export async function getProjectPayments(projectId: string): Promise<ProjectPayment[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('project_payments')
    .select('*')
    .eq('project_id', projectId)
    .order('fecha', { ascending: false });
  return (data ?? []) as ProjectPayment[];
}

export async function getProjectsByClient(clientId: string): Promise<ProjectRow[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('projects')
    .select(`
      *,
      clients!inner(nombre),
      quotes(quote_number)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((p: Record<string, unknown>) => ({
    ...(p as Omit<ProjectRow, 'client_name' | 'quote_number'>),
    client_name:  (p.clients as { nombre: string })?.nombre ?? '—',
    quote_number: (p.quotes  as { quote_number: string } | null)?.quote_number ?? null,
  }));
}
