'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ─── Crear proyecto desde cotización ─────────────────────────────────────────

export async function createProjectFromQuote(quoteId: string) {
  const db = getSupabaseAdmin();

  // Si ya existe un proyecto para esta cotización, redirigir al existente
  const { data: existing } = await db
    .from('projects')
    .select('id')
    .eq('quote_id', quoteId)
    .maybeSingle();

  if (existing) redirect(`/admin/projects/${existing.id}`);

  const { data: quote } = await db
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', quoteId)
    .single();

  if (!quote) return { error: 'Cotización no encontrada' };

  // Resolver client_id: cotización directa o via lead convertido
  let clientId = quote.client_id as string | null;
  if (!clientId && quote.lead_id) {
    const { data: lead } = await db.from('leads').select('client_id').eq('id', quote.lead_id).single();
    clientId = lead?.client_id ?? null;
  }
  if (!clientId) return { error: 'Primero convierte el lead a cliente para crear un proyecto.' };

  // Crear proyecto
  const { data: project, error: projError } = await db
    .from('projects')
    .insert({
      quote_id:        quoteId,
      client_id:       clientId,
      installation_id: quote.installation_id ?? null,
      nombre:          `Proyecto ${quote.quote_number}`,
      estado:          'pendiente',
    })
    .select('id')
    .single();

  if (projError) return { error: projError.message };

  // Copiar ítems de la cotización al proyecto
  const items = (quote.quote_items ?? []) as Array<{
    id: string; description: string; quantity: number;
    unit_price_clp: number; costo_proveedor_clp: number;
    discount_percent: number; total_clp: number; sort_order: number;
  }>;

  if (items.length > 0) {
    await db.from('project_items').insert(
      items.map(i => ({
        project_id:          project.id,
        quote_item_id:       i.id,
        description:         i.description,
        quantity:            i.quantity,
        unit_price_clp:      i.unit_price_clp,
        costo_proveedor_clp: i.costo_proveedor_clp,
        discount_percent:    i.discount_percent,
        total_clp:           i.total_clp,
        sort_order:          i.sort_order,
      }))
    );
  }

  revalidatePath('/admin/projects');
  redirect(`/admin/projects/${project.id}`);
}

// ─── Actualizar proyecto ──────────────────────────────────────────────────────

export async function updateProject(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('projects').update({
    nombre:        formData.get('nombre') as string,
    estado:        formData.get('estado') as string,
    fecha_inicio:  (formData.get('fecha_inicio') as string) || null,
    fecha_termino: (formData.get('fecha_termino') as string) || null,
    notas:         (formData.get('notas') as string) || null,
    updated_at:    new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${id}`);
  return { ok: true };
}

// ─── Ítems del proyecto ───────────────────────────────────────────────────────

export async function upsertProjectItem(projectId: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const itemId   = (formData.get('item_id') as string) || null;
  const qty      = parseFloat(formData.get('quantity') as string) || 1;
  const precio   = parseFloat(formData.get('unit_price_clp') as string) || 0;
  const costo    = parseFloat(formData.get('costo_proveedor_clp') as string) || 0;
  const descPct  = parseFloat(formData.get('discount_percent') as string) || 0;
  const total    = Math.round(precio * 1.19 * qty * (1 - descPct / 100));
  const order    = parseInt(formData.get('sort_order') as string) || 0;

  const payload = {
    project_id:          projectId,
    description:         formData.get('description') as string,
    quantity:            qty,
    unit_price_clp:      Math.round(precio),
    costo_proveedor_clp: Math.round(costo),
    discount_percent:    descPct,
    total_clp:           total,
    sort_order:          order,
  };

  let error;
  if (itemId) {
    ({ error } = await db.from('project_items').update(payload).eq('id', itemId));
  } else {
    ({ error } = await db.from('project_items').insert(payload));
  }

  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectItem(projectId: string, itemId: string) {
  const db = getSupabaseAdmin();
  await db.from('project_items').delete().eq('id', itemId);
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

// ─── Costos adicionales ───────────────────────────────────────────────────────

export async function addProjectCost(projectId: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('project_costs').insert({
    project_id:  projectId,
    descripcion: formData.get('descripcion') as string,
    monto_clp:   parseFloat(formData.get('monto_clp') as string) || 0,
    categoria:   formData.get('categoria') as string,
    notas:       (formData.get('notas') as string) || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectCost(projectId: string, costId: string) {
  const db = getSupabaseAdmin();
  await db.from('project_costs').delete().eq('id', costId);
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

export async function addProjectPayment(projectId: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('project_payments').insert({
    project_id: projectId,
    monto_clp:  parseFloat(formData.get('monto_clp') as string) || 0,
    fecha:      formData.get('fecha') as string,
    metodo:     formData.get('metodo') as string,
    referencia: (formData.get('referencia') as string) || null,
    notas:      (formData.get('notas') as string) || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectPayment(projectId: string, paymentId: string) {
  const db = getSupabaseAdmin();
  await db.from('project_payments').delete().eq('id', paymentId);
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

// ─── Reimportar ítems desde cotización ───────────────────────────────────────

export async function reimportItemsFromQuote(projectId: string) {
  const db = getSupabaseAdmin();

  const { data: project } = await db
    .from('projects')
    .select('quote_id')
    .eq('id', projectId)
    .single();

  if (!project?.quote_id) return { error: 'Este proyecto no tiene cotización vinculada.' };

  const { data: quoteItems } = await db
    .from('quote_items')
    .select('id, description, quantity, unit_price_clp, costo_proveedor_clp, discount_percent, total_clp, sort_order')
    .eq('quote_id', project.quote_id)
    .order('sort_order');

  if (!quoteItems?.length) return { error: 'La cotización no tiene ítems.' };

  // Borrar ítems actuales y reemplazar
  await db.from('project_items').delete().eq('project_id', projectId);

  const { error } = await db.from('project_items').insert(
    quoteItems.map(i => ({
      project_id:          projectId,
      quote_item_id:       i.id,
      description:         i.description,
      quantity:            i.quantity,
      unit_price_clp:      i.unit_price_clp,
      costo_proveedor_clp: i.costo_proveedor_clp,
      discount_percent:    i.discount_percent,
      total_clp:           i.total_clp,
      sort_order:          i.sort_order,
    }))
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}
