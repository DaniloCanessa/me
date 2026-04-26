'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateConfigParam(id: string, rawValue: string) {
  const value = parseFloat(rawValue);
  if (isNaN(value)) return { error: 'Valor numérico no válido' };

  const db = getSupabaseAdmin();
  const { error } = await db
    .from('config_parameters')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/config');
  return { ok: true };
}
