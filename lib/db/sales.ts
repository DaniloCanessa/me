import { getSupabaseAdmin } from '@/lib/supabase';

// Facturas de venta emitidas (módulo F29 — Fase A). El IVA débito del F29 sale
// de la suma de iva_clp de las facturas emitidas del mes.

export type SalesInvoiceType = 'factura' | 'boleta' | 'nota_credito' | 'nota_debito';
export type SalesInvoiceEstado = 'emitida' | 'anulada';

export type SalesInvoice = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  client_nombre: string | null;
  client_rut: string | null;
  tipo: SalesInvoiceType;
  folio: string | null;
  fecha_emision: string;          // YYYY-MM-DD
  neto_clp: number;
  iva_clp: number;
  total_clp: number;
  image_path: string | null;
  ocr_status: 'pendiente' | 'ok' | 'error';
  ocr_json: unknown;
  estado: SalesInvoiceEstado;
  notas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  project_name?: string | null;
};

// El documento del SII se guarda en el mismo bucket privado de las boletas de
// compra, bajo el prefijo ventas/ (parse-receipt descarga desde 'receipts').
const RECEIPTS_BUCKET = 'receipts';
const IVA = 1.19;

// ─── Lecturas ───────────────────────────────────────────────────────────────

export async function getSalesInvoices(): Promise<SalesInvoice[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('sales_invoices')
    .select('*, projects(nombre)')
    .order('fecha_emision', { ascending: false })
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ ...r, project_name: r.projects?.nombre ?? null }));
}

export async function getSalesInvoice(id: string): Promise<SalesInvoice | null> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('sales_invoices').select('*, projects(nombre)').eq('id', id).single();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return { ...row, project_name: row.projects?.nombre ?? null };
}

// Prellenado al elegir un proyecto: cliente (snapshot) + monto sugerido a partir
// del total de venta del proyecto (project_items.total_clp viene CON IVA).
export type SalesInvoicePrefill = {
  client_id: string | null;
  client_nombre: string | null;
  client_rut: string | null;
  neto_clp: number;
  iva_clp: number;
  total_clp: number;
};

export async function getSalesInvoicePrefill(projectId: string): Promise<SalesInvoicePrefill | null> {
  const db = getSupabaseAdmin();
  const { data: proj } = await db
    .from('projects')
    .select('client_id, clients(nombre, rut)')
    .eq('id', projectId)
    .single();
  if (!proj) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cli = (proj as any).clients as { nombre: string; rut: string | null } | null;

  const { data: items } = await db.from('project_items').select('total_clp').eq('project_id', projectId);
  const totalConIva = (items ?? []).reduce((s, it) => s + (Number((it as { total_clp: number }).total_clp) || 0), 0);
  const neto = Math.round(totalConIva / IVA);
  const iva = Math.round(totalConIva - neto);

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client_id: (proj as any).client_id ?? null,
    client_nombre: cli?.nombre ?? null,
    client_rut: cli?.rut ?? null,
    neto_clp: neto,
    iva_clp: iva,
    total_clp: Math.round(totalConIva),
  };
}

// ─── Storage (bucket privado, prefijo ventas/) ───────────────────────────────

export async function uploadSalesInvoiceDoc(bytes: ArrayBuffer, ext: string, contentType: string): Promise<string> {
  const db = getSupabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);
  const path = `ventas/${day}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(RECEIPTS_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function getSalesInvoiceDocSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function deleteSalesInvoiceDoc(path: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.storage.from(RECEIPTS_BUCKET).remove([path]);
}
