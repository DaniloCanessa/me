import { getSupabaseAdmin } from '@/lib/supabase';

export type ExpenseStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type OcrStatus = 'pendiente' | 'ok' | 'error';

// Categorías para gastos generales (overhead de la empresa, sin proyecto).
export const GENERAL_EXPENSE_CATEGORIES = [
  'Arriendo',
  'Sueldos',
  'Honorarios',
  'Servicios básicos',
  'Marketing',
  'Transporte',
  'Oficina',
  'Impuestos',
  'Comisiones',
  'Otros',
] as const;

// Cómo entró el documento a la app.
export type ExpenseOrigen = 'xml' | 'foto' | 'rcv' | 'manual';

// Una factura/boleta de compra. El proyecto es un centro de costo OPCIONAL que
// se vincula después desde la ficha del proyecto: el ingreso no lo pregunta.
export type ExpenseCapture = {
  id: string;
  image_path: string | null;
  status: ExpenseStatus;
  project_id: string | null;        // null = sin centro de costo asignado
  project_item_id: string | null;
  sin_proyecto: boolean;
  purchase_id: string | null;       // compra espejo en la cuenta corriente
  proveedor: string | null;
  rut: string | null;
  tipo: string | null;
  categoria: string | null;   // legado (sesión 26); reemplazado por account_id
  account_id: string | null;  // cuenta del plan de cuentas
  origen: ExpenseOrigen;
  xml_path: string | null;    // XML del DTE original (respaldo tributario)
  detalle_json: unknown;      // líneas del DTE
  activo_fijo: boolean;       // legado; hoy se deriva del grupo de la cuenta
  folio: string | null;
  fecha: string | null;
  neto: number | null;
  iva: number | null;
  total: number | null;
  con_iva: boolean;
  moneda: string;
  notas: string | null;
  ocr_status: OcrStatus;
  ocr_json: unknown;
  captured_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  project_name?: string | null;
  account_nombre?: string | null;
  account_grupo?: string | null;
};

const RECEIPTS_BUCKET = 'receipts';

// ─── Lecturas ───────────────────────────────────────────────────────────────

export async function getExpenseCaptures(opts?: { status?: ExpenseStatus }): Promise<ExpenseCapture[]> {
  const db = getSupabaseAdmin();
  let q = db
    .from('expense_captures')
    .select('*, projects(nombre)')
    .order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ ...r, project_name: r.projects?.nombre ?? null }));
}

export async function getExpenseCapture(id: string): Promise<ExpenseCapture | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('expense_captures')
    .select('*, projects(nombre)')
    .eq('id', id)
    .single();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return { ...row, project_name: row.projects?.nombre ?? null };
}

// ─── Facturas de compra (vista del módulo /admin/facturas) ───────────────────

const SELECT_WITH_JOINS = '*, projects(nombre), purchase_accounts(nombre, grupo)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapInvoice = (r: any): ExpenseCapture => ({
  ...r,
  project_name:    r.projects?.nombre ?? null,
  account_nombre:  r.purchase_accounts?.nombre ?? null,
  account_grupo:   r.purchase_accounts?.grupo ?? null,
});

export type PurchaseFilters = {
  periodo?: string;        // 'AAAA-MM' — filtra por fecha del documento
  grupo?: string;          // grupo contable de la cuenta
  sinClasificar?: boolean; // solo las que no tienen cuenta asignada
  sinProyecto?: boolean;   // solo las que no están vinculadas a un proyecto
  buscar?: string;         // proveedor, RUT o folio
};

export async function getPurchaseInvoices(f: PurchaseFilters = {}): Promise<ExpenseCapture[]> {
  const db = getSupabaseAdmin();
  let q = db.from('expense_captures').select(SELECT_WITH_JOINS).neq('status', 'rechazado');

  if (f.periodo && /^\d{4}-\d{2}$/.test(f.periodo)) {
    const [y, m] = f.periodo.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    q = q.gte('fecha', `${f.periodo}-01`).lte('fecha', `${f.periodo}-${String(last).padStart(2, '0')}`);
  }
  if (f.sinClasificar) q = q.is('account_id', null);
  if (f.sinProyecto) q = q.is('project_id', null);
  if (f.buscar) {
    const s = f.buscar.replace(/[%,]/g, '');
    q = q.or(`proveedor.ilike.%${s}%,rut.ilike.%${s}%,folio.ilike.%${s}%`);
  }

  const { data } = await q.order('fecha', { ascending: false, nullsFirst: false }).limit(500);
  let rows = (data ?? []).map(mapInvoice);
  // El grupo vive en la cuenta relacionada: se filtra en memoria (el listado
  // está acotado a 500 filas, no justifica una vista en la base).
  if (f.grupo) rows = rows.filter((r) => r.account_grupo === f.grupo);
  return rows;
}

// Documento ya registrado con el mismo proveedor + folio + tipo. Se consulta
// ANTES de insertar para dar un mensaje claro en vez del error del índice único.
export async function findDuplicatePurchase(
  rut: string | null, folio: string | null, tipo: string | null,
): Promise<ExpenseCapture | null> {
  if (!rut || !folio || !folio.trim()) return null;
  const db = getSupabaseAdmin();
  const clean = rut.replace(/[.\s]/g, '').toUpperCase();
  const { data } = await db
    .from('expense_captures')
    .select(SELECT_WITH_JOINS)
    .eq('folio', folio.trim())
    .neq('status', 'rechazado')
    .limit(50);

  for (const row of (data ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    const sameRut = (r.rut ?? '').replace(/[.\s]/g, '').toUpperCase() === clean;
    const sameTipo = (r.tipo ?? 'factura') === (tipo ?? 'factura');
    if (sameRut && sameTipo) return mapInvoice(r);
  }
  return null;
}

// Cuántas facturas quedaron sin clasificar (badge del menú).
export async function countUnclassifiedPurchases(): Promise<number> {
  const db = getSupabaseAdmin();
  const { count } = await db
    .from('expense_captures')
    .select('*', { count: 'exact', head: true })
    .is('account_id', null)
    .neq('status', 'rechazado');
  return count ?? 0;
}

export async function countPendingExpenses(): Promise<number> {
  const db = getSupabaseAdmin();
  const { count } = await db
    .from('expense_captures')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendiente');
  return count ?? 0;
}

// ─── Storage (bucket privado, acceso server-side con service role) ───────────

export async function uploadReceiptImage(bytes: ArrayBuffer, ext: string, contentType: string): Promise<string> {
  const db = getSupabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(RECEIPTS_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

// El XML del DTE se guarda como respaldo tributario bajo el prefijo xml/.
export async function uploadDteXml(text: string, nombre: string): Promise<string> {
  const db = getSupabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);
  const safe = nombre.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const path = `xml/${day}/${crypto.randomUUID()}_${safe}`;
  const { error } = await db.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, new Blob([text], { type: 'application/xml' }), { contentType: 'application/xml', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

// URL temporal firmada para mostrar la imagen en la revisión (bucket privado).
export async function getReceiptSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
