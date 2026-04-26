import { getSupabaseAdmin } from '@/lib/supabase';
import type { AdminUser } from '@/lib/types';

export async function getUsers(): Promise<AdminUser[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('users')
    .select('id, email, name, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: true });
  return (data ?? []) as AdminUser[];
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('users')
    .select('id, email, name, role, is_active, created_at, updated_at')
    .eq('id', id)
    .single();
  return (data ?? null) as AdminUser | null;
}
