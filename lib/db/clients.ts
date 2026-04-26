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
