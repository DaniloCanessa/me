'use server';

import { revalidatePath } from 'next/cache';
import { importRcv, getConciliacion } from '@/lib/db/sii';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAdminUser } from '@/lib/auth';
import { uploadReceiptImage } from '@/lib/db/expenses';

function n(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.-]/g, '');
  return s === '' ? 0 : Math.round(parseFloat(s) || 0);
}

function revalidateAll() {
  revalidatePath('/admin/conciliacion');
  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/balance');
  revalidatePath('/admin/gastos');
}

// Sube un CSV del RCV del SII (compras o ventas) para el período. El tipo se
// detecta por el encabezado del archivo.
export async function uploadRcvCsv(periodo: string, formData: FormData) {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: 'Período inválido' };
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'Selecciona el archivo CSV del SII' };

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: 'No se pudo leer el archivo' };
  }

  const res = await importRcv(periodo, text);
  if (res.error) return { error: res.error };

  revalidatePath('/admin/conciliacion');
  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/balance');
  return { ok: true, kind: res.kind, count: res.count };
}

// Registra una factura del RCV como gasto general (sin proyecto), pre-llenada
// con los datos del SII + categoría / activo fijo / imagen opcional.
export async function registrarGastoGeneral(formData: FormData) {
  const total = n(formData.get('total'));
  if (total <= 0) return { error: 'Falta el total de la factura' };

  let image_path: string | null = null;
  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      image_path = await uploadReceiptImage(await file.arrayBuffer(), ext, file.type || 'image/jpeg');
    } catch { /* la imagen es opcional */ }
  }

  const user = await getAdminUser();
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await db.from('expense_captures').insert({
    image_path,
    status: 'aprobado', sin_proyecto: true, project_id: null,
    tipo: 'factura',
    proveedor: (formData.get('razon_social') as string) || null,
    rut:   (formData.get('rut') as string) || null,
    folio: (formData.get('folio') as string) || null,
    fecha: (formData.get('fecha') as string) || null,
    neto: n(formData.get('neto')), iva: n(formData.get('iva')), total,
    con_iva: true,
    categoria: (formData.get('categoria') as string) || null,
    activo_fijo: formData.get('activo_fijo') === 'true',
    notas: (formData.get('notas') as string) || null,
    captured_by: user?.name ?? user?.email ?? null,
    reviewed_by: user?.name ?? user?.email ?? null,
    reviewed_at: now,
  });
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// Registra de una vez todas las facturas del SII que faltan en la app (sin
// imagen, sin categoría) — el usuario las categoriza después.
export async function registrarTodasGenerales(periodo: string) {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: 'Período inválido' };
  const conc = await getConciliacion(periodo);
  const faltantes = conc.compras.filter((c) => c.estado === 'falta_en_app' && c.sii);
  if (faltantes.length === 0) return { ok: true, count: 0 };

  const user = await getAdminUser();
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const rows = faltantes.map((c) => ({
    image_path: null, status: 'aprobado', sin_proyecto: true, project_id: null, tipo: 'factura',
    proveedor: c.sii!.razon_social || null, rut: c.sii!.rut_proveedor || null, folio: c.sii!.folio || null,
    fecha: c.sii!.fecha_docto, neto: c.sii!.monto_neto, iva: c.sii!.monto_iva, total: c.sii!.monto_total,
    con_iva: true, categoria: null, activo_fijo: false,
    captured_by: user?.name ?? user?.email ?? null, reviewed_by: user?.name ?? user?.email ?? null, reviewed_at: now,
  }));
  const { error } = await db.from('expense_captures').insert(rows);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true, count: rows.length };
}
