'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAdminUser } from '@/lib/auth';
import { uploadReceiptImage } from '@/lib/db/expenses';

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}

// Decodifica el selector de proyecto: '' = decidir luego, '__sin__' = sin
// proyecto explícito, cualquier otro valor = id de proyecto.
function decodeProjectSelect(sel: string): { projectId: string | null; sinProyecto: boolean; hasProject: boolean } {
  if (sel === '__sin__') return { projectId: null, sinProyecto: true, hasProject: false };
  if (sel && sel !== '') return { projectId: sel, sinProyecto: false, hasProject: true };
  return { projectId: null, sinProyecto: false, hasProject: false };
}

// ─── Captura (foto + proyecto opcional) ──────────────────────────────────────

export async function createExpenseCapture(formData: FormData) {
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'Falta la imagen de la boleta' };

  const type = file.type || 'image/jpeg';
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

  let image_path: string;
  try {
    const bytes = await file.arrayBuffer();
    image_path = await uploadReceiptImage(bytes, ext, type);
  } catch (e) {
    return { error: 'No se pudo subir la imagen: ' + (e instanceof Error ? e.message : '') };
  }

  const { projectId, sinProyecto } = decodeProjectSelect((formData.get('project_select') as string) || '');
  const user = await getAdminUser();

  const db = getSupabaseAdmin();
  const { error } = await db.from('expense_captures').insert({
    image_path,
    project_id: projectId,
    sin_proyecto: sinProyecto,
    notas: (formData.get('notas') as string) || null,
    captured_by: user?.name ?? user?.email ?? 'desconocido',
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/gastos');
  return { ok: true };
}

// ─── Gasto general manual (sin proyecto, aprobado directo) ────────────────────

export async function createGeneralExpense(formData: FormData) {
  const monto = numOrNull(formData.get('total'));
  if (!monto || monto <= 0) return { error: 'Ingresa un monto válido' };

  const categoria = (formData.get('categoria') as string) || 'Otros';
  const fecha = (formData.get('fecha') as string) || new Date().toISOString().slice(0, 10);
  const conIva = formData.get('con_iva') === 'true';
  const proveedor = (formData.get('proveedor') as string) || null;
  const notas = (formData.get('notas') as string) || null;

  // Foto opcional (muchos gastos generales no tienen boleta para fotografiar).
  let image_path: string | null = null;
  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      image_path = await uploadReceiptImage(await file.arrayBuffer(), ext, file.type || 'image/jpeg');
    } catch { /* la foto es opcional: si falla la subida, seguimos sin imagen */ }
  }

  const user = await getAdminUser();
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await db.from('expense_captures').insert({
    image_path,
    status:       'aprobado',
    sin_proyecto: true,
    project_id:   null,
    categoria,
    tipo:         'gasto_general',
    total:        monto,
    con_iva:      conIva,
    fecha,
    proveedor,
    notas,
    captured_by:  user?.name ?? user?.email ?? 'desconocido',
    reviewed_by:  user?.name ?? user?.email ?? null,
    reviewed_at:  now,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/gastos');
  revalidatePath('/admin/finanzas');
  return { ok: true };
}

// ─── Guardar edición / resultado del OCR (sin cambiar estado) ─────────────────

export async function saveExpenseCapture(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const ocrRaw = formData.get('ocr_json') as string | null;

  const { error } = await db.from('expense_captures').update({
    proveedor: (formData.get('proveedor') as string) || null,
    rut:       (formData.get('rut') as string) || null,
    tipo:      (formData.get('tipo') as string) || null,
    folio:     (formData.get('folio') as string) || null,
    fecha:     (formData.get('fecha') as string) || null,
    neto:      numOrNull(formData.get('neto')),
    iva:       numOrNull(formData.get('iva')),
    total:     numOrNull(formData.get('total')),
    con_iva:   formData.get('con_iva') === 'true',
    notas:     (formData.get('notas') as string) || null,
    ...(ocrRaw ? { ocr_status: 'ok', ocr_json: JSON.parse(ocrRaw) } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/gastos');
  return { ok: true };
}

// ─── Aprobar ──────────────────────────────────────────────────────────────────

export async function approveExpenseCapture(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const user = await getAdminUser();

  const proveedor = (formData.get('proveedor') as string) || null;
  const folio     = (formData.get('folio') as string) || null;
  const fecha     = (formData.get('fecha') as string) || null;
  const tipo      = (formData.get('tipo') as string) || 'factura';
  const total     = numOrNull(formData.get('total'));
  const conIva    = formData.get('con_iva') === 'true';
  const notas     = (formData.get('notas') as string) || null;

  const { projectId, sinProyecto, hasProject } = decodeProjectSelect((formData.get('project_select') as string) || '');
  const itemId = (formData.get('project_item_id') as string) || null;
  // Categoría solo aplica al gasto general (sin proyecto); con proyecto va a la
  // cuenta corriente del proyecto y no se categoriza.
  const categoria = !hasProject ? ((formData.get('categoria') as string) || null) : null;

  // Con proyecto → se crea una compra real (entra a la cuenta corriente).
  let purchaseId: string | null = null;
  if (hasProject && projectId) {
    const monto = total ?? 0;
    const purchaseTipo = tipo === 'anticipo' ? 'anticipo' : 'factura';
    const { data, error } = await db.from('project_purchases').insert({
      project_id:               projectId,
      project_item_id:          itemId || null,
      tipo:                     purchaseTipo,
      proveedor,
      folio,
      cantidad_comprada:        1,
      precio_unitario_sin_iva:  monto,
      costo_referencia_sin_iva: null,
      monto_clp:                monto,
      con_iva:                  conIva,
      fecha:                    fecha ?? new Date().toISOString().slice(0, 10),
      notas,
    }).select('id').single();
    if (error) return { error: 'No se pudo crear la compra: ' + error.message };
    purchaseId = data.id as string;
  }

  const { error } = await db.from('expense_captures').update({
    status:          'aprobado',
    proveedor,
    rut:             (formData.get('rut') as string) || null,
    tipo,
    folio,
    fecha,
    neto:            numOrNull(formData.get('neto')),
    iva:             numOrNull(formData.get('iva')),
    total,
    con_iva:         conIva,
    notas,
    project_id:      hasProject ? projectId : null,
    project_item_id: hasProject ? (itemId || null) : null,
    sin_proyecto:    !hasProject || sinProyecto,
    categoria,
    purchase_id:     purchaseId,
    reviewed_by:     user?.name ?? user?.email ?? null,
    reviewed_at:     new Date().toISOString(),
    updated_at:      new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/gastos');
  revalidatePath('/admin/finanzas');
  if (hasProject && projectId) revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

// ─── Rechazar / eliminar ──────────────────────────────────────────────────────

export async function rejectExpenseCapture(id: string) {
  const db = getSupabaseAdmin();
  const user = await getAdminUser();
  const { error } = await db.from('expense_captures').update({
    status: 'rechazado',
    reviewed_by: user?.name ?? user?.email ?? null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/gastos');
  return { ok: true };
}

export async function deleteExpenseCapture(id: string) {
  const db = getSupabaseAdmin();
  // Borra la imagen del storage (best-effort) y luego la fila.
  const { data: row } = await db.from('expense_captures').select('image_path').eq('id', id).single();
  if (row?.image_path) {
    await db.storage.from('receipts').remove([row.image_path]);
  }
  const { error } = await db.from('expense_captures').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/gastos');
  return { ok: true };
}

// ─── Ítems de un proyecto (para el selector en la revisión) ───────────────────

export async function getProjectItemsForExpense(projectId: string): Promise<Array<{ id: string; description: string }>> {
  if (!projectId) return [];
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('project_items')
    .select('id, description')
    .eq('project_id', projectId)
    .order('sort_order');
  return (data ?? []) as Array<{ id: string; description: string }>;
}
