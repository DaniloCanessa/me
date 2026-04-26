'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createClient(formData: FormData) {
  const db = getSupabaseAdmin();
  const { error, data } = await db.from('clients').insert({
    nombre:   formData.get('nombre') as string,
    rut:      (formData.get('rut') as string) || null,
    empresa:  (formData.get('empresa') as string) || null,
    ciudad:   (formData.get('ciudad') as string) || null,
    telefono: (formData.get('telefono') as string) || null,
    email:    (formData.get('email') as string) || null,
    notas:    (formData.get('notas') as string) || null,
    source:   (formData.get('source') as string) || 'manual',
  }).select('id').single();

  if (error) return { error: error.message };
  revalidatePath('/admin/clients');
  return { ok: true, id: data?.id };
}

export async function updateClient(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('clients').update({
    nombre:     formData.get('nombre') as string,
    rut:        (formData.get('rut') as string) || null,
    empresa:    (formData.get('empresa') as string) || null,
    ciudad:     (formData.get('ciudad') as string) || null,
    telefono:   (formData.get('telefono') as string) || null,
    email:      (formData.get('email') as string) || null,
    notas:      (formData.get('notas') as string) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/clients');
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

export async function deleteClient(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('clients').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/clients');
  return { ok: true };
}

export async function convertLeadToClient(leadId: string) {
  const db = getSupabaseAdmin();

  const { data: lead } = await db
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (!lead) return { error: 'Lead no encontrado' };
  if (lead.client_id) return { error: 'Este lead ya fue convertido', clientId: lead.client_id };

  const supplyDetails = lead.supply_details as Record<string, unknown> ?? {};

  const { data: client, error: clientError } = await db
    .from('clients')
    .insert({
      lead_id:  leadId,
      nombre:   lead.name ?? lead.contact_name ?? lead.email,
      email:    lead.email,
      telefono: lead.phone ?? null,
      empresa:  (lead as Record<string, unknown>).company_name as string ?? null,
      ciudad:   lead.city ?? null,
      source:   'simulador',
    })
    .select('id')
    .single();

  if (clientError) {
    console.error('[convertLeadToClient] clients insert error:', clientError);
    return { error: clientError.message };
  }

  const clientId = client.id;

  // Crear primera instalación con los datos del lead
  await db.from('installations').insert({
    client_id:                   clientId,
    lead_id:                     leadId,
    nombre_instalacion:          'Instalación principal',
    direccion:                   lead.address ?? null,
    ciudad:                      lead.city ?? null,
    region_id:                   lead.region_id ?? null,
    customer_type:               lead.customer_category ?? null,
    distribuidora:               lead.distribuidora ?? null,
    tarifa:                      lead.tarifa ?? null,
    amperaje_a:                  supplyDetails.amperajeA as number ?? null,
    potencia_contratada_kw:      supplyDetails.potenciaContratadaKW as number ?? null,
    tension_suministro:          supplyDetails.tensionSuministro as string ?? null,
    consumo_promedio_mensual_kwh: lead.avg_monthly_kwh ?? null,
    simulation_data:             lead.simulation_summary ?? null,
  });

  // Vincular lead al cliente
  await db.from('leads').update({ client_id: clientId }).eq('id', leadId);

  revalidatePath('/admin/leads');
  revalidatePath('/admin/clients');
  return { ok: true, clientId };
}

export async function addActivity(formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('activities').insert({
    client_id:   formData.get('client_id') as string,
    lead_id:     (formData.get('lead_id') as string) || null,
    tipo:        formData.get('tipo') as string,
    descripcion: formData.get('descripcion') as string,
    fecha:       (formData.get('fecha') as string) || new Date().toISOString(),
  });

  if (error) return { error: error.message };
  const clientId = formData.get('client_id') as string;
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

export async function addInstallation(formData: FormData) {
  const db = getSupabaseAdmin();
  const clientId = formData.get('client_id') as string;
  const { error } = await db.from('installations').insert({
    client_id:                   clientId,
    nombre_instalacion:          formData.get('nombre_instalacion') as string,
    direccion:                   (formData.get('direccion') as string) || null,
    ciudad:                      (formData.get('ciudad') as string) || null,
    region_id:                   (formData.get('region_id') as string) || null,
    customer_type:               (formData.get('customer_type') as string) || null,
    distribuidora:               (formData.get('distribuidora') as string) || null,
    tarifa:                      (formData.get('tarifa') as string) || null,
    amperaje_a:                  formData.get('amperaje_a') ? parseInt(formData.get('amperaje_a') as string) : null,
    potencia_contratada_kw:      formData.get('potencia_contratada_kw') ? parseFloat(formData.get('potencia_contratada_kw') as string) : null,
    tension_suministro:          (formData.get('tension_suministro') as string) || null,
    consumo_promedio_mensual_kwh: formData.get('consumo_kwh') ? parseFloat(formData.get('consumo_kwh') as string) : null,
    notas:                       (formData.get('notas') as string) || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}
