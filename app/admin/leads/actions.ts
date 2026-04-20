'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { LeadStatus } from './page';

export async function updateStatus(formData: FormData) {
  const id     = formData.get('id') as string;
  const status = formData.get('status') as LeadStatus;
  const db = getSupabaseAdmin();
  await db.from('leads').update({ status }).eq('id', id);
  revalidatePath('/admin/leads');
}

export async function updateLeadDetails(formData: FormData) {
  const id               = formData.get('id') as string;
  const notes            = (formData.get('notes') as string) || null;
  const visit_date       = (formData.get('visit_date') as string) || null;
  const quoted_price_raw = formData.get('quoted_price_clp') as string;
  const quoted_price_clp = quoted_price_raw ? parseFloat(quoted_price_raw) : null;

  const db = getSupabaseAdmin();
  await db.from('leads').update({ notes, visit_date, quoted_price_clp }).eq('id', id);
  revalidatePath('/admin/leads');
}

export async function logout() {
  const { cookies } = await import('next/headers');
  (await cookies()).set('admin_token', '', { maxAge: 0, path: '/' });
}
