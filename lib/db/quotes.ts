import { getSupabaseAdmin } from '@/lib/supabase';
import type { Quote, QuoteItem } from '@/lib/types';

export async function getQuotes(): Promise<Quote[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Quote[];
}

export async function getQuote(id: string): Promise<Quote | null> {
  const db = getSupabaseAdmin();
  const { data: quote } = await db
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();
  if (!quote) return null;

  const { data: items } = await db
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  return { ...(quote as Quote), items: (items ?? []) as QuoteItem[] };
}

export async function getQuoteByToken(token: string): Promise<Quote | null> {
  const db = getSupabaseAdmin();
  const { data: quote } = await db
    .from('quotes')
    .select('*')
    .eq('token', token)
    .single();
  if (!quote) return null;

  const { data: items } = await db
    .from('quote_items')
    .select('*')
    .eq('quote_id', (quote as Quote).id)
    .order('sort_order', { ascending: true });

  return { ...(quote as Quote), items: (items ?? []) as QuoteItem[] };
}

export async function getQuotesByClient(clientId: string): Promise<Quote[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('quotes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Quote[];
}
