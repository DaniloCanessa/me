'use server';

import { revalidatePath } from 'next/cache';
import { importRcv, getConciliacion } from '@/lib/db/sii';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAdminUser } from '@/lib/auth';
import { uploadReceiptImage, findDuplicatePurchase } from '@/lib/db/expenses';
import { getDefaultAccountId, suggestAccountsForSuppliers } from '@/lib/db/accounts';

function n(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.-]/g, '');
  return s === '' ? 0 : Math.round(parseFloat(s) || 0);
}

function revalidateAll() {
  revalidatePath('/admin/facturas');
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

// Registra una factura del RCV que falta en la app, pre-llenada con los datos
// del SII + la cuenta contable e imagen opcional.
export async function registrarGastoGeneral(formData: FormData) {
  const total = n(formData.get('total'));
  if (total <= 0) return { error: 'Falta el total de la factura' };

  const dup = await findDuplicatePurchase(
    (formData.get('rut') as string) || null,
    (formData.get('folio') as string) || null,
    'factura',
  );
  if (dup) {
    return { error: `Esa factura ya estaba registrada (${dup.proveedor ?? 'proveedor'} · folio ${dup.folio}, ${dup.fecha ?? 'sin fecha'}).` };
  }

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
    origen: 'rcv',
    account_id: (formData.get('account_id') as string) || await getDefaultAccountId(),
    notas: (formData.get('notas') as string) || null,
    captured_by: user?.name ?? user?.email ?? null,
    reviewed_by: user?.name ?? user?.email ?? null,
    reviewed_at: now,
  });
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// Registra de una vez todas las facturas del SII que faltan en la app. Quedan
// con la cuenta por defecto (o la que ya usó ese proveedor antes), así el
// balance no queda con un hueco; se pueden reclasificar en un clic desde
// la pestaña Compras.
export async function registrarTodasGenerales(periodo: string) {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: 'Período inválido' };
  const conc = await getConciliacion(periodo);
  const candidatas = conc.compras.filter((c) => c.estado === 'falta_en_app' && c.sii);
  if (candidatas.length === 0) return { ok: true, count: 0 };

  const normRut = (s: string | null | undefined) => (s ?? '').replace(/[.\s]/g, '').toUpperCase();
  const normFolio = (s: string | null | undefined) => {
    const clean = (s ?? '').trim();
    const stripped = clean.replace(/^0+/, '');
    return stripped === '' ? clean : stripped;
  };

  // Red de seguridad: la conciliación busca las facturas de la app DENTRO del
  // mes, así que una registrada sin fecha (o con la fecha fuera del período)
  // aparece siempre como "falta en app" y se reinsertaba en cada corrida. Así
  // se generaron los duplicados que había hasta la sesión 32. Antes de
  // insertar se descartan las que ya existen, mirando TODA la tabla.
  const dbCheck = getSupabaseAdmin();
  const { data: existentes } = await dbCheck
    .from('expense_captures')
    .select('rut, folio, tipo')
    .neq('status', 'rechazado');
  const yaRegistradas = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((existentes ?? []) as any[]).map((r) => `${normRut(r.rut)}|${normFolio(r.folio)}`),
  );

  const faltantes = candidatas.filter(
    (c) => !yaRegistradas.has(`${normRut(c.sii!.rut_proveedor)}|${normFolio(c.sii!.folio)}`),
  );
  const omitidas = candidatas.length - faltantes.length;
  if (faltantes.length === 0) {
    return { ok: true, count: 0, omitidas };
  }

  const [sugerencias, porDefecto] = await Promise.all([
    suggestAccountsForSuppliers(faltantes.map((c) => c.sii!.rut_proveedor)),
    getDefaultAccountId(),
  ]);

  const user = await getAdminUser();
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const rows = faltantes.map((c) => ({
    image_path: null, status: 'aprobado', sin_proyecto: true, project_id: null,
    // Las notas de crédito del SII (montos negativos) se marcan como tal para
    // que resten donde corresponde en vez de sumar como una factura más.
    tipo: c.sii!.monto_total < 0 ? 'nota_credito' : 'factura',
    origen: 'rcv',
    proveedor: c.sii!.razon_social || null, rut: c.sii!.rut_proveedor || null, folio: c.sii!.folio || null,
    fecha: c.sii!.fecha_docto,
    neto: Math.abs(c.sii!.monto_neto), iva: Math.abs(c.sii!.monto_iva), total: Math.abs(c.sii!.monto_total),
    con_iva: true,
    account_id: sugerencias[normRut(c.sii!.rut_proveedor)] ?? porDefecto,
    captured_by: user?.name ?? user?.email ?? null, reviewed_by: user?.name ?? user?.email ?? null, reviewed_at: now,
  }));
  const { error } = await db.from('expense_captures').insert(rows);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true, count: rows.length, omitidas };
}
