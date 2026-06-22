'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAdminUser } from '@/lib/auth';
import {
  uploadSalesInvoiceDoc, deleteSalesInvoiceDoc, getSalesInvoicePrefill,
  type SalesInvoicePrefill,
} from '@/lib/db/sales';

function numOrZero(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (s === '') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
}

// Prellenado del cliente + monto al elegir un proyecto (lo llama el form).
export async function prefillSalesInvoice(projectId: string): Promise<SalesInvoicePrefill | null> {
  if (!projectId) return null;
  return getSalesInvoicePrefill(projectId);
}

async function maybeUploadDoc(formData: FormData): Promise<string | null> {
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return null;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return uploadSalesInvoiceDoc(await file.arrayBuffer(), ext, file.type || 'image/jpeg');
}

export async function createSalesInvoice(formData: FormData) {
  const total = numOrZero(formData.get('total_clp'));
  if (total <= 0) return { error: 'Ingresa un total válido' };

  const projectId = (formData.get('project_id') as string) || null;
  const ocrRaw = (formData.get('ocr_json') as string) || null;

  let image_path: string | null = null;
  try {
    image_path = await maybeUploadDoc(formData);
  } catch (e) {
    return { error: 'No se pudo subir el documento: ' + (e instanceof Error ? e.message : '') };
  }

  const user = await getAdminUser();
  const db = getSupabaseAdmin();
  const { error } = await db.from('sales_invoices').insert({
    project_id:    projectId,
    client_id:     (formData.get('client_id') as string) || null,
    client_nombre: (formData.get('client_nombre') as string) || null,
    client_rut:    (formData.get('client_rut') as string) || null,
    tipo:          (formData.get('tipo') as string) || 'factura',
    folio:         (formData.get('folio') as string) || null,
    fecha_emision: (formData.get('fecha_emision') as string) || new Date().toISOString().slice(0, 10),
    neto_clp:      numOrZero(formData.get('neto_clp')),
    iva_clp:       numOrZero(formData.get('iva_clp')),
    total_clp:     total,
    image_path,
    ocr_status:    ocrRaw ? 'ok' : 'pendiente',
    ocr_json:      ocrRaw ? JSON.parse(ocrRaw) : null,
    notas:         (formData.get('notas') as string) || null,
    created_by:    user?.name ?? user?.email ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/facturas-venta');
  revalidatePath('/admin/finanzas');
  return { ok: true };
}

export async function updateSalesInvoice(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('sales_invoices').update({
    project_id:    (formData.get('project_id') as string) || null,
    client_nombre: (formData.get('client_nombre') as string) || null,
    client_rut:    (formData.get('client_rut') as string) || null,
    tipo:          (formData.get('tipo') as string) || 'factura',
    folio:         (formData.get('folio') as string) || null,
    fecha_emision: (formData.get('fecha_emision') as string) || null,
    neto_clp:      numOrZero(formData.get('neto_clp')),
    iva_clp:       numOrZero(formData.get('iva_clp')),
    total_clp:     numOrZero(formData.get('total_clp')),
    notas:         (formData.get('notas') as string) || null,
    updated_at:    new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/facturas-venta');
  revalidatePath('/admin/finanzas');
  return { ok: true };
}

// Anular / reactivar: una factura anulada no suma al IVA débito del F29.
export async function setSalesInvoiceEstado(id: string, estado: 'emitida' | 'anulada') {
  const db = getSupabaseAdmin();
  const { error } = await db.from('sales_invoices')
    .update({ estado, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/facturas-venta');
  revalidatePath('/admin/finanzas');
  return { ok: true };
}

export async function deleteSalesInvoice(id: string) {
  const db = getSupabaseAdmin();
  const { data: row } = await db.from('sales_invoices').select('image_path').eq('id', id).single();
  if (row?.image_path) { await deleteSalesInvoiceDoc(row.image_path); }
  const { error } = await db.from('sales_invoices').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/facturas-venta');
  revalidatePath('/admin/finanzas');
  return { ok: true };
}
