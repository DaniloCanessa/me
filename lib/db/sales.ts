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
  // Estado de pago / cobranza
  fecha_compromiso: string | null;   // YYYY-MM-DD — dispara la cobranza
  condicion_pago: CondicionPago;
  cobranza_pausada: boolean;
  cobranza_ultimo_envio: string | null;
  cobranza_nivel: string | null;
  // joined
  project_name?: string | null;
};

// Condición pactada. Los plazos en días se cuentan desde la fecha de emisión.
export type CondicionPago = 'contado' | '15' | '30' | '60' | '90' | 'manual';

export const CONDICION_LABEL: Record<CondicionPago, string> = {
  contado: 'Contado',
  '15': '15 días',
  '30': '30 días',
  '60': '60 días',
  '90': '90 días',
  manual: 'Fecha manual',
};

export type SalesInvoicePayment = {
  id: string;
  sales_invoice_id: string;
  fecha: string;
  monto_clp: number;
  metodo: 'transferencia' | 'cheque' | 'efectivo' | 'credito' | 'otro';
  referencia: string | null;
  notas: string | null;
  project_payment_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type EstadoPago = 'pagada' | 'parcial' | 'por_vencer' | 'vencida';

// Una factura con su estado de pago ya calculado (lo que ve la vista Cobranza).
export type SalesInvoiceWithPago = SalesInvoice & {
  pagos: SalesInvoicePayment[];
  pagado: number;
  saldo: number;
  pctPagado: number;         // 0–100
  estadoPago: EstadoPago;
  diasVencido: number;       // >0 vencida, <0 aún no vence, 0 vence hoy
};

// Fecha de compromiso a partir de la condición pactada.
export function calcFechaCompromiso(fechaEmision: string, condicion: CondicionPago, manual?: string | null): string | null {
  if (condicion === 'manual') return manual || null;
  const dias = condicion === 'contado' ? 0 : parseInt(condicion, 10);
  if (isNaN(dias)) return manual || null;
  const d = new Date(fechaEmision + 'T00:00:00');
  if (isNaN(d.getTime())) return manual || null;
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Días de atraso respecto del compromiso (hoy en Chile). Ambas fechas se leen
// como UTC para que la diferencia sea de días de calendario exactos, sin que un
// cambio de horario meta o saque un día.
function diasDeAtraso(fechaCompromiso: string | null, hoy: string): number {
  if (!fechaCompromiso) return -9999;   // sin compromiso = no entra a cobranza
  const a = Date.parse(`${fechaCompromiso}T00:00:00Z`);
  const b = Date.parse(`${hoy}T00:00:00Z`);
  if (isNaN(a) || isNaN(b)) return -9999;
  return Math.round((b - a) / 86400000);
}

export function withEstadoPago(
  inv: SalesInvoice, pagos: SalesInvoicePayment[], hoy: string,
): SalesInvoiceWithPago {
  const pagado = pagos.reduce((s, p) => s + (Number(p.monto_clp) || 0), 0);
  const total = Number(inv.total_clp) || 0;
  const saldo = Math.max(0, total - pagado);
  const pctPagado = total > 0 ? Math.min(100, Math.round((pagado / total) * 100)) : 0;
  const diasVencido = diasDeAtraso(inv.fecha_compromiso, hoy);

  // Se considera pagada con una holgura de $1 por los redondeos del neto+IVA.
  const estadoPago: EstadoPago =
    saldo <= 1 ? 'pagada'
    : diasVencido > 0 ? 'vencida'
    : pagado > 0 ? 'parcial'
    : 'por_vencer';

  return { ...inv, pagos, pagado, saldo, pctPagado, estadoPago, diasVencido };
}

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

// Fecha de hoy en Chile (el servidor corre en UTC: sin esto, entre las 21:00 y
// medianoche de Chile la cobranza usaría el día siguiente).
export function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Facturas con sus pagos y el estado de pago ya calculado.
export async function getSalesInvoicesWithPago(): Promise<SalesInvoiceWithPago[]> {
  const db = getSupabaseAdmin();
  const [invRes, payRes] = await Promise.all([
    db.from('sales_invoices').select('*, projects(nombre)')
      .order('fecha_emision', { ascending: false }).order('created_at', { ascending: false }),
    db.from('sales_invoice_payments').select('*').order('fecha', { ascending: false }),
  ]);

  const pagosPorFactura = new Map<string, SalesInvoicePayment[]>();
  for (const p of (payRes.data ?? []) as SalesInvoicePayment[]) {
    const list = pagosPorFactura.get(p.sales_invoice_id) ?? [];
    list.push(p);
    pagosPorFactura.set(p.sales_invoice_id, list);
  }

  const hoy = hoyChile();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((invRes.data ?? []) as any[]).map((r) => {
    const inv = { ...r, project_name: r.projects?.nombre ?? null } as SalesInvoice;
    return withEstadoPago(inv, pagosPorFactura.get(inv.id) ?? [], hoy);
  });
}

export async function getSalesInvoicePayments(invoiceId: string): Promise<SalesInvoicePayment[]> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('sales_invoice_payments').select('*')
    .eq('sales_invoice_id', invoiceId).order('fecha', { ascending: false });
  return (data ?? []) as SalesInvoicePayment[];
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
