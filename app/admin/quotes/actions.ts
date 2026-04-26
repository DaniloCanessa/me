'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createQuote(clientId: string, installationId?: string) {
  const db = getSupabaseAdmin();

  const { data: client } = await db
    .from('clients')
    .select('nombre, email, telefono')
    .eq('id', clientId)
    .single();

  if (!client) return { error: 'Cliente no encontrado' };

  const { data: quote, error } = await db
    .from('quotes')
    .insert({
      client_id:       clientId,
      installation_id: installationId ?? null,
      status:          'draft',
      client_name:     client.nombre,
      client_email:    client.email ?? '',
      client_phone:    client.telefono ?? null,
      subtotal_clp:    0,
      discount_clp:    0,
      total_clp:       0,
      validity_days:   10,
      token:           crypto.randomUUID(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  redirect(`/admin/quotes/${quote.id}`);
}

export async function updateQuoteHeader(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('quotes').update({
    client_name:     formData.get('client_name') as string,
    client_email:    formData.get('client_email') as string,
    client_phone:    (formData.get('client_phone') as string) || null,
    notes:           (formData.get('notes') as string) || null,
    client_notes:    (formData.get('client_notes') as string) || null,
    validity_days:   parseInt(formData.get('validity_days') as string) || 10,
    installation_id: (formData.get('installation_id') as string) || null,
    updated_at:      new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/quotes/${id}`);
  return { ok: true };
}

export async function updateQuoteStatus(id: string, status: string) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const extra: Record<string, string | null> = {};

  if (status === 'sent')     extra.sent_at = now;
  if (status === 'accepted') extra.accepted_at = now;
  if (status === 'rejected') extra.rejected_at = now;

  const { error } = await db.from('quotes').update({
    status, ...extra, updated_at: now,
  }).eq('id', id);

  if (error) return { error: error.message };

  // Sync lead status when quote is accepted or rejected
  if (status === 'accepted' || status === 'rejected') {
    const { data: quote } = await db.from('quotes').select('lead_id').eq('id', id).single();
    if (quote?.lead_id) {
      const leadStatus = status === 'accepted' ? 'won' : 'lost';
      const { data: lead } = await db.from('leads').select('status').eq('id', quote.lead_id).single();
      if (lead && lead.status !== leadStatus) {
        await db.from('leads').update({ status: leadStatus, updated_at: now }).eq('id', quote.lead_id);
        await db.from('lead_status_history').insert({
          lead_id:     quote.lead_id,
          from_status: lead.status,
          to_status:   leadStatus,
          created_at:  now,
        });
        revalidatePath(`/admin/leads/${quote.lead_id}`);
        revalidatePath('/admin/leads');
      }
    }
  }

  revalidatePath(`/admin/quotes/${id}`);
  revalidatePath('/admin/quotes');
  return { ok: true };
}

export async function upsertQuoteItem(quoteId: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const itemId           = (formData.get('item_id') as string) || null;
  const costo            = parseFloat(formData.get('costo_proveedor_clp') as string) || 0;
  const margenRaw        = formData.get('margen_pct') as string;
  const margen           = margenRaw !== '' && margenRaw !== null ? parseFloat(margenRaw) : 30;
  const quantity         = parseFloat(formData.get('quantity') as string) || 1;
  const discount_percent = parseFloat(formData.get('discount_percent') as string) || 0;
  const directPriceIva   = parseFloat(formData.get('unit_price_direct') as string) || 0;

  // Modo precio directo (ítem libre): el usuario ingresa el precio final c/IVA
  const precio_neto_unit = directPriceIva > 0
    ? directPriceIva / 1.19
    : costo * (1 + margen / 100);
  const precio_con_iva   = precio_neto_unit * 1.19;
  const total_clp        = precio_con_iva * quantity * (1 - discount_percent / 100);

  const payload = {
    quote_id:            quoteId,
    product_id:          (formData.get('product_id') as string) || null,
    description:         formData.get('description') as string,
    quantity,
    costo_proveedor_clp: directPriceIva > 0 ? 0 : costo,
    margen_pct:          directPriceIva > 0 ? null : margen,
    unit_price_clp:      Math.round(precio_neto_unit),
    discount_percent,
    total_clp:           Math.round(total_clp),
    sort_order:          parseInt(formData.get('sort_order') as string) || 0,
  };

  let error;
  if (itemId) {
    ({ error } = await db.from('quote_items').update(payload).eq('id', itemId));
  } else {
    ({ error } = await db.from('quote_items').insert(payload));
  }

  if (error) return { error: error.message };
  await recalcTotals(quoteId);
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true };
}

export async function deleteQuoteItem(quoteId: string, itemId: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('quote_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  await recalcTotals(quoteId);
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true };
}

async function recalcTotals(quoteId: string) {
  const db = getSupabaseAdmin();
  const { data: items } = await db
    .from('quote_items')
    .select('quantity, unit_price_clp, discount_percent, total_clp')
    .eq('quote_id', quoteId);

  const subtotal_neto = (items ?? []).reduce((acc, item) => {
    return acc + item.unit_price_clp * item.quantity * (1 - item.discount_percent / 100);
  }, 0);

  const total_con_iva = Math.round(subtotal_neto * 1.19);

  await db.from('quotes').update({
    subtotal_clp: Math.round(subtotal_neto),
    total_clp:    total_con_iva,
    updated_at:   new Date().toISOString(),
  }).eq('id', quoteId);
}

export async function deleteQuote(id: string) {
  const db = getSupabaseAdmin();
  await db.from('quote_items').delete().eq('quote_id', id);
  const { error } = await db.from('quotes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/quotes');
  redirect('/admin/quotes');
}
