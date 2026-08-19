import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Plan de cuentas de compras ──────────────────────────────────────────────
// Cada factura de compra se clasifica en una cuenta, y cada cuenta declara a
// qué grupo del balance pertenece. El grupo es lo único que el balance mira:
//   costo_giro  → Costo de ventas
//   gasto_admin → Gastos de administración
//   activo_fijo → Activo fijo (no es gasto: se activa y se deprecia)
// La lista es editable desde el back-office, por eso vive en la base y no en
// una constante del código.

export type AccountGroup = 'costo_giro' | 'gasto_admin' | 'activo_fijo';

export type PurchaseAccount = {
  id: string;
  codigo: string;
  nombre: string;
  grupo: AccountGroup;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  es_default: boolean;
};

export const ACCOUNT_GROUP_LABEL: Record<AccountGroup, string> = {
  costo_giro:  'Costo del giro',
  gasto_admin: 'Gasto de administración',
  activo_fijo: 'Activo fijo',
};

export const ACCOUNT_GROUP_HELP: Record<AccountGroup, string> = {
  costo_giro:  'Lo que compras para ejecutar los trabajos. Va al Costo de Ventas.',
  gasto_admin: 'El costo de tener la empresa funcionando. Va a Gastos de administración.',
  activo_fijo: 'Bienes que duran más de un año. No es gasto: se activa y se deprecia.',
};

export const ACCOUNT_GROUPS: AccountGroup[] = ['costo_giro', 'gasto_admin', 'activo_fijo'];

// ─── Lecturas ────────────────────────────────────────────────────────────────

export async function getPurchaseAccounts(opts?: { incluirInactivas?: boolean }): Promise<PurchaseAccount[]> {
  const db = getSupabaseAdmin();
  let q = db.from('purchase_accounts').select('*').order('orden');
  if (!opts?.incluirInactivas) q = q.eq('activo', true);
  const { data } = await q;
  return (data ?? []) as PurchaseAccount[];
}

export async function getDefaultAccountId(): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('purchase_accounts')
    .select('id')
    .eq('es_default', true)
    .eq('activo', true)
    .maybeSingle();
  if (data) return (data as { id: string }).id;
  // Si nadie marcó una preseleccionada, cae en la primera activa por orden.
  const { data: first } = await db
    .from('purchase_accounts')
    .select('id')
    .eq('activo', true)
    .order('orden')
    .limit(1)
    .maybeSingle();
  return first ? (first as { id: string }).id : null;
}

// ─── Memoria por proveedor ───────────────────────────────────────────────────
// La segunda factura de un proveedor ya viene clasificada: se reusa la cuenta
// de la última factura suya que quedó clasificada. Es lo que hace que el
// ingreso deje de ser una decisión y pase a ser un "guardar".

export async function suggestAccountForSupplier(rut: string | null): Promise<string | null> {
  if (!rut) return null;
  const db = getSupabaseAdmin();
  const clean = rut.replace(/[.\s]/g, '').toUpperCase();
  const { data } = await db
    .from('expense_captures')
    .select('account_id, rut, created_at')
    .not('account_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  for (const row of (data ?? []) as Array<{ account_id: string; rut: string | null }>) {
    if ((row.rut ?? '').replace(/[.\s]/g, '').toUpperCase() === clean) return row.account_id;
  }
  return null;
}

// Sugerencias en lote (para la carga de varios XML de una vez): devuelve un
// mapa RUT normalizado → account_id, con una sola consulta.
export async function suggestAccountsForSuppliers(ruts: string[]): Promise<Record<string, string>> {
  const norm = (s: string) => s.replace(/[.\s]/g, '').toUpperCase();
  const wanted = new Set(ruts.filter(Boolean).map(norm));
  if (wanted.size === 0) return {};

  const db = getSupabaseAdmin();
  const { data } = await db
    .from('expense_captures')
    .select('account_id, rut, created_at')
    .not('account_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  const out: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ account_id: string; rut: string | null }>) {
    const key = norm(row.rut ?? '');
    if (wanted.has(key) && !out[key]) out[key] = row.account_id;
  }
  return out;
}
