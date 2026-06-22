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

// Una boleta/factura capturada en la bandeja de gastos.
export type ExpenseCapture = {
  id: string;
  image_path: string;
  status: ExpenseStatus;
  project_id: string | null;        // null = sin proyecto (gasto general)
  project_item_id: string | null;
  sin_proyecto: boolean;
  purchase_id: string | null;       // compra creada al aprobar con proyecto
  proveedor: string | null;
  rut: string | null;
  tipo: string | null;
  categoria: string | null;   // para gastos generales (sin proyecto)
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

// URL temporal firmada para mostrar la imagen en la revisión (bucket privado).
export async function getReceiptSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
