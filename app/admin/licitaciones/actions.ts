'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { syncTenders } from '@/lib/mercadopublico';
import type { SyncResult } from '@/lib/mercadopublico';
import type { TenderStatus } from '@/lib/types';

/** Sincronización manual desde el backoffice (la diaria corre por cron). */
export async function syncTendersNow(): Promise<SyncResult> {
  const result = await syncTenders();
  revalidatePath('/admin/licitaciones');
  return result;
}

export async function updateTenderStatus(codigoExterno: string, estado: TenderStatus) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('tenders')
    .update({ estado_interno: estado, updated_at: new Date().toISOString() })
    .eq('codigo_externo', codigoExterno);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/licitaciones');
  return { ok: true };
}

/** Marca todas las licitaciones "nueva" como "vista". */
export async function markAllTendersSeen() {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('tenders')
    .update({ estado_interno: 'vista', updated_at: new Date().toISOString() })
    .eq('estado_interno', 'nueva');
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/licitaciones');
  return { ok: true };
}

// ─── Palabras clave parametrizables ──────────────────────────────────────────

export async function addTenderKeyword(keyword: string) {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return { ok: false, message: 'Palabra vacía' };
  const db = getSupabaseAdmin();
  const { error } = await db.from('tender_keywords').insert({ keyword: clean });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/licitaciones');
  return { ok: true };
}

export async function toggleTenderKeyword(id: string, isActive: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('tender_keywords').update({ is_active: isActive }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/licitaciones');
  return { ok: true };
}

export async function deleteTenderKeyword(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('tender_keywords').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/licitaciones');
  return { ok: true };
}
