'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAdminUser } from '@/lib/auth';
import { parseDteXml, dteTipoLabel, type DteDoc } from '@/lib/dte';
import {
  uploadReceiptImage, uploadDteXml, findDuplicatePurchase,
} from '@/lib/db/expenses';
import { getDefaultAccountId, suggestAccountsForSuppliers } from '@/lib/db/accounts';
import { calcFechaCompromiso, type CondicionPago } from '@/lib/db/sales';

// El RUT del contribuyente: sirve para detectar si un XML es una factura de
// COMPRA (nosotros somos el receptor) o de VENTA (somos el emisor).
const RUT_EMPRESA = (process.env.EMPRESA_RUT ?? '77958683-9').replace(/[.\s]/g, '').toUpperCase();

const norm = (s: string | null | undefined) => (s ?? '').replace(/[.\s]/g, '').toUpperCase();

function num(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.-]/g, '');
  return s === '' ? 0 : Math.round(parseFloat(s) || 0);
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}

const txt = (v: FormDataEntryValue | null): string | null => {
  const s = (v as string) ?? '';
  return s.trim() === '' ? null : s.trim();
};

function revalidateAll() {
  revalidatePath('/admin/facturas');
  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/balance');
  revalidatePath('/admin/conciliacion');
}

// ─── Ingreso por XML del DTE ─────────────────────────────────────────────────

export type ImportedDoc = {
  archivo: string;
  emisor: string;
  tipo: string;          // etiqueta legible
  folio: string;
  fecha: string | null;
  total: number;
  estado: 'creada' | 'duplicada' | 'venta' | 'error';
  detalle?: string;      // motivo cuando no se creó
};

export type ImportDteResult = {
  ok: boolean;
  creadas: number;
  duplicadas: number;
  ventas: number;
  errores: number;
  docs: ImportedDoc[];
  error?: string;
};

// Sube uno o varios XML de facturas electrónicas. Cada archivo puede traer un
// documento suelto o un sobre con varios. Los que ya existen se informan como
// duplicados en vez de insertarse dos veces; los que nos tienen como emisor
// (facturas de VENTA) se avisan para que se registren en la pestaña Ventas.
export async function importDteXmlFiles(formData: FormData): Promise<ImportDteResult> {
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, creadas: 0, duplicadas: 0, ventas: 0, errores: 0, docs: [], error: 'Selecciona al menos un archivo XML' };

  // Se leen todos primero para poder sugerir la cuenta en una sola consulta.
  type Pendiente = { doc: DteDoc; archivo: string; xml: string };
  const pendientes: Pendiente[] = [];
  const docs: ImportedDoc[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      docs.push({ archivo: file.name, emisor: '—', tipo: '—', folio: '—', fecha: null, total: 0, estado: 'error', detalle: 'No se pudo leer el archivo' });
      continue;
    }

    const parsed = parseDteXml(text);
    if (parsed.error || parsed.docs.length === 0) {
      docs.push({ archivo: file.name, emisor: '—', tipo: '—', folio: '—', fecha: null, total: 0, estado: 'error', detalle: parsed.error ?? 'Sin documentos' });
      continue;
    }
    for (const doc of parsed.docs) pendientes.push({ doc, archivo: file.name, xml: text });
  }

  const sugerencias = await suggestAccountsForSuppliers(pendientes.map((p) => p.doc.rutEmisor));
  const cuentaPorDefecto = await getDefaultAccountId();
  const user = await getAdminUser();
  const db = getSupabaseAdmin();
  const quien = user?.name ?? user?.email ?? null;
  const ahora = new Date().toISOString();

  let creadas = 0, duplicadas = 0, ventas = 0, errores = 0;

  for (const { doc, archivo, xml } of pendientes) {
    const base: ImportedDoc = {
      archivo,
      emisor: doc.razonSocialEmisor || doc.rutEmisor,
      tipo: dteTipoLabel(doc.tipoDte),
      folio: doc.folio,
      fecha: doc.fechaEmision,
      total: doc.montoTotal,
      estado: 'creada',
    };

    // Si nosotros emitimos el documento es una venta, no una compra.
    if (norm(doc.rutEmisor) === RUT_EMPRESA) {
      ventas++;
      docs.push({ ...base, estado: 'venta', detalle: 'Es una factura de venta (la emitiste tú) — regístrala en la pestaña Ventas' });
      continue;
    }

    const dup = await findDuplicatePurchase(doc.rutEmisor, doc.folio, doc.tipo);
    if (dup) {
      duplicadas++;
      docs.push({ ...base, estado: 'duplicada', detalle: `Ya estaba registrada el ${dup.fecha ?? dup.created_at.slice(0, 10)}` });
      continue;
    }

    // El XML se guarda como respaldo tributario. Si la subida falla, la factura
    // se registra igual: el dato importante ya está leído.
    let xmlPath: string | null = null;
    try {
      xmlPath = await uploadDteXml(xml, archivo);
    } catch { /* respaldo opcional */ }

    const { error } = await db.from('expense_captures').insert({
      image_path:   null,
      status:       'aprobado',      // el XML es exacto: no necesita revisión
      origen:       'xml',
      xml_path:     xmlPath,
      detalle_json: doc.detalle.length ? doc.detalle : null,
      project_id:   null,
      sin_proyecto: true,
      proveedor:    doc.razonSocialEmisor || null,
      rut:          doc.rutEmisor || null,
      tipo:         doc.tipo,
      folio:        doc.folio || null,
      fecha:        doc.fechaEmision,
      neto:         doc.montoNeto + doc.montoExento,
      iva:          doc.iva,
      total:        doc.montoTotal,
      con_iva:      true,
      account_id:   sugerencias[norm(doc.rutEmisor)] ?? cuentaPorDefecto,
      ocr_status:   'ok',
      captured_by:  quien,
      reviewed_by:  quien,
      reviewed_at:  ahora,
    });

    if (error) {
      errores++;
      docs.push({ ...base, estado: 'error', detalle: error.message });
    } else {
      creadas++;
      docs.push(base);
    }
  }

  revalidateAll();
  return { ok: true, creadas, duplicadas, ventas, errores, docs };
}

// ─── Ingreso por imagen / PDF (OCR) y a mano ─────────────────────────────────

// Crea la factura con los datos ya confirmados. La imagen es opcional: sirve
// tanto para "subí la foto y el OCR la leyó" como para "la tecleé".
export async function createPurchaseInvoice(formData: FormData) {
  const total = num(formData.get('total'));
  if (total <= 0) return { error: 'Ingresa el total de la factura' };

  const rut = txt(formData.get('rut'));
  const folio = txt(formData.get('folio'));
  const tipo = (formData.get('tipo') as string) || 'factura';

  const dup = await findDuplicatePurchase(rut, folio, tipo);
  if (dup) {
    return { error: `Esa factura ya está registrada (${dup.proveedor ?? 'proveedor'} · folio ${dup.folio}, ${dup.fecha ?? 'sin fecha'}).` };
  }

  let image_path: string | null = null;
  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      image_path = await uploadReceiptImage(await file.arrayBuffer(), ext, file.type || 'image/jpeg');
    } catch (e) {
      return { error: 'No se pudo subir la imagen: ' + (e instanceof Error ? e.message : '') };
    }
  }

  const user = await getAdminUser();
  const quien = user?.name ?? user?.email ?? null;
  const ahora = new Date().toISOString();
  const ocrRaw = txt(formData.get('ocr_json'));

  const db = getSupabaseAdmin();
  const { error } = await db.from('expense_captures').insert({
    image_path,
    status:       'aprobado',
    origen:       image_path ? 'foto' : 'manual',
    project_id:   null,
    sin_proyecto: true,
    proveedor:    txt(formData.get('proveedor')),
    rut, tipo, folio,
    fecha:        txt(formData.get('fecha')) ?? new Date().toISOString().slice(0, 10),
    neto:         numOrNull(formData.get('neto')),
    iva:          numOrNull(formData.get('iva')),
    total,
    con_iva:      formData.get('con_iva') !== 'false',
    account_id:   txt(formData.get('account_id')) ?? await getDefaultAccountId(),
    notas:        txt(formData.get('notas')),
    ocr_status:   ocrRaw ? 'ok' : 'pendiente',
    ocr_json:     ocrRaw ? JSON.parse(ocrRaw) : null,
    captured_by:  quien,
    reviewed_by:  quien,
    reviewed_at:  ahora,
  });
  if (error) return { error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function updatePurchaseInvoice(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('expense_captures').update({
    proveedor:  txt(formData.get('proveedor')),
    rut:        txt(formData.get('rut')),
    tipo:       (formData.get('tipo') as string) || 'factura',
    folio:      txt(formData.get('folio')),
    fecha:      txt(formData.get('fecha')),
    neto:       numOrNull(formData.get('neto')),
    iva:        numOrNull(formData.get('iva')),
    total:      numOrNull(formData.get('total')),
    con_iva:    formData.get('con_iva') !== 'false',
    account_id: txt(formData.get('account_id')),
    notas:      txt(formData.get('notas')),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// Clasificación rápida desde el listado (un solo clic por factura).
export async function classifyPurchaseInvoice(id: string, accountId: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('expense_captures')
    .update({ account_id: accountId || null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function deletePurchaseInvoice(id: string) {
  const db = getSupabaseAdmin();
  const { data: row } = await db.from('expense_captures')
    .select('image_path, xml_path, purchase_id').eq('id', id).single();

  // La compra espejo en el proyecto se borra con la factura (si existía).
  if (row?.purchase_id) await db.from('project_purchases').delete().eq('id', row.purchase_id);

  const paths = [row?.image_path, row?.xml_path].filter((p): p is string => !!p);
  if (paths.length) await db.storage.from('receipts').remove(paths);

  const { error } = await db.from('expense_captures').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// ─── Centro de costo: vincular facturas a un proyecto ────────────────────────
//
// El ingreso de la factura no pregunta por proyecto. Cuando quieres saber
// cuánto costó una obra, entras a su ficha y vinculas las facturas que le
// corresponden: eso crea la compra espejo en su cuenta corriente.

export async function linkInvoicesToProject(projectId: string, invoiceIds: string[]) {
  if (!projectId || invoiceIds.length === 0) return { error: 'Selecciona al menos una factura' };
  const db = getSupabaseAdmin();

  const { data: facturas } = await db
    .from('expense_captures')
    .select('id, proveedor, folio, fecha, total, con_iva, tipo, purchase_id')
    .in('id', invoiceIds);

  let vinculadas = 0;
  for (const f of (facturas ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = f as any;
    if (r.purchase_id) continue;   // ya estaba vinculada a algún proyecto

    const monto = Number(r.total) || 0;
    const { data: compra, error: errCompra } = await db.from('project_purchases').insert({
      project_id:               projectId,
      project_item_id:          null,
      tipo:                     'factura',
      proveedor:                r.proveedor,
      folio:                    r.folio,
      cantidad_comprada:        1,
      precio_unitario_sin_iva:  monto,
      costo_referencia_sin_iva: null,
      monto_clp:                monto,
      con_iva:                  !!r.con_iva,
      fecha:                    r.fecha ?? new Date().toISOString().slice(0, 10),
      notas:                    null,
    }).select('id').single();
    if (errCompra) return { error: 'No se pudo crear la compra: ' + errCompra.message };

    const { error } = await db.from('expense_captures').update({
      project_id:   projectId,
      sin_proyecto: false,
      purchase_id:  (compra as { id: string }).id,
      updated_at:   new Date().toISOString(),
    }).eq('id', r.id);
    if (error) {
      await db.from('project_purchases').delete().eq('id', (compra as { id: string }).id);
      return { error: error.message };
    }
    vinculadas++;
  }

  revalidateAll();
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true, count: vinculadas };
}

export async function unlinkInvoiceFromProject(invoiceId: string) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('expense_captures')
    .select('project_id, purchase_id').eq('id', invoiceId).single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (row?.purchase_id) await db.from('project_purchases').delete().eq('id', row.purchase_id);

  const { error } = await db.from('expense_captures').update({
    project_id: null, project_item_id: null, sin_proyecto: true, purchase_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', invoiceId);
  if (error) return { error: error.message };

  revalidateAll();
  if (row?.project_id) revalidatePath(`/admin/projects/${row.project_id}`);
  return { ok: true };
}

// Facturas todavía sin centro de costo, para el selector de la ficha del
// proyecto. Se acotan a los últimos meses para que la lista sea manejable.
export async function getUnlinkedInvoices(): Promise<Array<{
  id: string; proveedor: string | null; folio: string | null; fecha: string | null;
  total: number | null; cuenta: string | null;
}>> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('expense_captures')
    .select('id, proveedor, folio, fecha, total, purchase_accounts(nombre)')
    .is('project_id', null)
    .eq('status', 'aprobado')
    .order('fecha', { ascending: false, nullsFirst: false })
    .limit(200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id, proveedor: r.proveedor, folio: r.folio, fecha: r.fecha,
    total: r.total, cuenta: r.purchase_accounts?.nombre ?? null,
  }));
}

// ─── Facturas de venta: compromiso de pago y pagos ───────────────────────────

export async function updateCompromisoPago(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const condicion = ((formData.get('condicion_pago') as string) || 'contado') as CondicionPago;

  const { data: inv } = await db.from('sales_invoices')
    .select('fecha_emision').eq('id', id).single();
  if (!inv) return { error: 'No se encontró la factura' };

  const fecha = calcFechaCompromiso(
    (inv as { fecha_emision: string }).fecha_emision,
    condicion,
    txt(formData.get('fecha_compromiso')),
  );

  const { error } = await db.from('sales_invoices').update({
    condicion_pago:   condicion,
    fecha_compromiso: fecha,
    updated_at:       new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/facturas');
  return { ok: true, fecha_compromiso: fecha };
}

export async function setCobranzaPausada(id: string, pausada: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('sales_invoices')
    .update({ cobranza_pausada: pausada, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/facturas');
  return { ok: true };
}

// Registra un abono. Si la factura está vinculada a un proyecto, crea TAMBIÉN
// el pago en la cuenta corriente del proyecto y lo enlaza, para que la caja no
// se cuente dos veces ni haya que digitarlo dos veces.
export async function addSalesPayment(invoiceId: string, formData: FormData) {
  const monto = num(formData.get('monto_clp'));
  if (monto <= 0) return { error: 'Ingresa un monto válido' };

  const db = getSupabaseAdmin();
  const { data: inv } = await db.from('sales_invoices')
    .select('project_id, folio, total_clp').eq('id', invoiceId).single();
  if (!inv) return { error: 'No se encontró la factura' };

  const fecha = txt(formData.get('fecha')) ?? new Date().toISOString().slice(0, 10);
  const metodo = (formData.get('metodo') as string) || 'transferencia';
  const referencia = txt(formData.get('referencia'));
  const notas = txt(formData.get('notas'));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectId = (inv as any).project_id as string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folio = (inv as any).folio as string | null;

  let projectPaymentId: string | null = null;
  if (projectId) {
    const { data: pp, error: ppErr } = await db.from('project_payments').insert({
      project_id: projectId,
      monto_clp:  monto,
      fecha,
      metodo,
      referencia,
      notas: notas ?? (folio ? `Pago factura ${folio}` : null),
    }).select('id').single();
    if (ppErr) return { error: 'No se pudo registrar el pago en el proyecto: ' + ppErr.message };
    projectPaymentId = (pp as { id: string }).id;
  }

  const user = await getAdminUser();
  const { error } = await db.from('sales_invoice_payments').insert({
    sales_invoice_id:   invoiceId,
    fecha, monto_clp:   monto, metodo, referencia, notas,
    project_payment_id: projectPaymentId,
    created_by:         user?.name ?? user?.email ?? null,
  });
  if (error) {
    // Si falla el abono, se revierte el espejo para no dejar caja inflada.
    if (projectPaymentId) await db.from('project_payments').delete().eq('id', projectPaymentId);
    return { error: error.message };
  }

  revalidatePath('/admin/facturas');
  revalidatePath('/admin/finanzas');
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

export async function deleteSalesPayment(id: string) {
  const db = getSupabaseAdmin();
  const { data: row } = await db.from('sales_invoice_payments')
    .select('project_payment_id, sales_invoice_id').eq('id', id).single();

  if (row?.project_payment_id) {
    await db.from('project_payments').delete().eq('id', row.project_payment_id);
  }
  const { error } = await db.from('sales_invoice_payments').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/facturas');
  revalidatePath('/admin/finanzas');
  return { ok: true };
}

// ─── Plan de cuentas (editable) ──────────────────────────────────────────────

export async function savePurchaseAccount(formData: FormData) {
  const id = txt(formData.get('id'));
  const nombre = txt(formData.get('nombre'));
  const grupo = (formData.get('grupo') as string) || 'gasto_admin';
  if (!nombre) return { error: 'Ponle un nombre a la cuenta' };

  const db = getSupabaseAdmin();
  const payload = {
    nombre,
    grupo,
    descripcion: txt(formData.get('descripcion')),
    orden:       num(formData.get('orden')) || 100,
    updated_at:  new Date().toISOString(),
  };

  if (id) {
    const { error } = await db.from('purchase_accounts').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    // Código estable derivado del nombre (no cambia al renombrar la cuenta).
    // El rango ̀-ͯ son las tildes que deja NFD al separar los acentos.
    const SIN_TILDES = new RegExp('[\\u0300-\\u036f]', 'g');
    const codigo = nombre.toLowerCase().normalize('NFD').replace(SIN_TILDES, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `cuenta_${Date.now()}`;
    const { error } = await db.from('purchase_accounts').insert({ ...payload, codigo });
    if (error) return { error: error.message };
  }

  revalidateAll();
  revalidatePath('/admin/config');
  return { ok: true };
}

// No se borran cuentas (romperían las facturas ya clasificadas): se desactivan.
export async function togglePurchaseAccount(id: string, activo: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('purchase_accounts')
    .update({ activo, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function setDefaultPurchaseAccount(id: string) {
  const db = getSupabaseAdmin();
  // El índice único exige que solo una quede marcada: se limpia antes.
  await db.from('purchase_accounts').update({ es_default: false }).eq('es_default', true);
  const { error } = await db.from('purchase_accounts').update({ es_default: true }).eq('id', id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}
