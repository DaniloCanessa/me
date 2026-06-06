import { getSupabaseAdmin } from '@/lib/supabase';
import type { Tender, TenderKeyword } from '@/lib/types';

export async function getTenders(): Promise<Tender[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('tenders')
      .select('*')
      .order('fecha_publicacion', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return [];
    return (data ?? []) as Tender[];
  } catch {
    return [];
  }
}

export async function getTenderKeywords(): Promise<TenderKeyword[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('tender_keywords')
      .select('*')
      .order('keyword', { ascending: true });
    if (error) return [];
    return (data ?? []) as TenderKeyword[];
  } catch {
    return [];
  }
}
