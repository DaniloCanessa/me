'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { LeadStatus } from './page';

export async function updateStatus(formData: FormData) {
  const id     = formData.get('id') as string;
  const status = formData.get('status') as LeadStatus;
  const db = getSupabaseAdmin();

  const { data: current } = await db.from('leads').select('status').eq('id', id).single();

  await db.from('leads').update({ status }).eq('id', id);

  if (current && current.status !== status) {
    await db.from('lead_status_history').insert({
      lead_id:     id,
      from_status: current.status,
      to_status:   status,
    });
  }

  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${id}`);
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

export async function addLeadNote(formData: FormData) {
  const db       = getSupabaseAdmin();
  const lead_id  = formData.get('lead_id') as string;
  const tipo     = formData.get('tipo') as string;
  const contenido = (formData.get('contenido') as string).trim();

  if (!contenido) return { error: 'El contenido es requerido' };

  const { error } = await db.from('lead_notes').insert({ lead_id, tipo, contenido });
  if (error) return { error: error.message };
  revalidatePath(`/admin/leads/${lead_id}`);
  return { ok: true };
}

export async function createQuoteFromLead(leadId: string) {
  const db = getSupabaseAdmin();

  const { data: lead } = await db
    .from('leads')
    .select('name, email, phone')
    .eq('id', leadId)
    .single();

  if (!lead) return { error: 'Lead no encontrado' };

  const { data: quote, error } = await db
    .from('quotes')
    .insert({
      lead_id:      leadId,
      status:       'draft',
      client_name:  lead.name ?? lead.email,
      client_email: lead.email,
      client_phone: lead.phone ?? null,
      subtotal_clp: 0,
      discount_clp: 0,
      total_clp:    0,
      validity_days: 10,
      token:        crypto.randomUUID(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await db.from('leads').update({ status: 'quoted' }).eq('id', leadId);

  revalidatePath('/admin/leads');
  redirect(`/admin/quotes/${quote.id}`);
}

export async function createQuoteFromSimulation(leadId: string) {
  const db = getSupabaseAdmin();

  const { data: lead } = await db
    .from('leads')
    .select('name, email, phone, scenarios_json, kit_size_kwp, kit_price_clp')
    .eq('id', leadId)
    .single();

  if (!lead) return { error: 'Lead no encontrado' };

  const { data: quote, error } = await db
    .from('quotes')
    .insert({
      lead_id:       leadId,
      status:        'draft',
      client_name:   lead.name ?? lead.email,
      client_email:  lead.email,
      client_phone:  lead.phone ?? null,
      subtotal_clp:  0,
      discount_clp:  0,
      total_clp:     0,
      validity_days: 10,
      token:         crypto.randomUUID(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Pre-cargar escenario recomendado como ítem libre
  type ScenarioData = { kitSizeKWp: number; kitPriceCLP: number; panelCount: number; areaM2: number };
  const scenarios = lead.scenarios_json as Record<string, ScenarioData> | null;
  const sc: ScenarioData | null =
    scenarios?.A ??
    (lead.kit_size_kwp && lead.kit_price_clp
      ? { kitSizeKWp: lead.kit_size_kwp, kitPriceCLP: lead.kit_price_clp, panelCount: 0, areaM2: 0 }
      : null);

  if (sc) {
    const precioNeto = Math.round(sc.kitPriceCLP / 1.19);
    const desc = sc.panelCount > 0
      ? `PFV ${sc.kitSizeKWp} kWp — ${sc.panelCount} paneles · ${sc.areaM2} m²`
      : `PFV ${sc.kitSizeKWp} kWp`;

    const { error: itemError } = await db.from('quote_items').insert({
      quote_id:            quote.id,
      description:         desc,
      quantity:            1,
      costo_proveedor_clp: 0,
      margen_pct:          30,
      unit_price_clp:      precioNeto,
      discount_percent:    0,
      total_clp:           sc.kitPriceCLP,
      sort_order:          0,
    });

    if (itemError) {
      console.error('[createQuoteFromSimulation] quote_items insert error:', itemError);
    } else {
      await db.from('quotes').update({
        subtotal_clp: precioNeto,
        total_clp:    sc.kitPriceCLP,
      }).eq('id', quote.id);
    }
  } else {
    console.error('[createQuoteFromSimulation] sin datos de kit para lead:', leadId, {
      scenarios_json: lead.scenarios_json,
      kit_size_kwp:   lead.kit_size_kwp,
      kit_price_clp:  lead.kit_price_clp,
    });
  }

  await db.from('leads').update({ status: 'quoted' }).eq('id', leadId);
  revalidatePath('/admin/leads');
  redirect(`/admin/quotes/${quote.id}`);
}

export async function assignLead(leadId: string, userId: string | null) {
  const db = getSupabaseAdmin();
  await db.from('leads').update({ assigned_to: userId }).eq('id', leadId);
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function setFollowUpDate(leadId: string, date: string | null) {
  const db = getSupabaseAdmin();
  await db.from('leads').update({ follow_up_date: date || null }).eq('id', leadId);
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function moveLeadToStatus(leadId: string, status: LeadStatus) {
  const db = getSupabaseAdmin();
  const { data: current } = await db.from('leads').select('status').eq('id', leadId).single();
  await db.from('leads').update({ status }).eq('id', leadId);
  if (current && current.status !== status) {
    await db.from('lead_status_history').insert({
      lead_id: leadId,
      from_status: current.status,
      to_status: status,
    });
  }
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function logout() {
  const { cookies } = await import('next/headers');
  (await cookies()).set('admin_token', '', { maxAge: 0, path: '/' });
}
