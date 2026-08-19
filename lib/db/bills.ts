import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Boletas de luz archivadas ───────────────────────────────────────────────
// El archivo que se sube al simulador para autocompletar queda guardado en el
// bucket privado 'receipts' (el mismo de las facturas de compra), bajo el
// prefijo 'boletas-luz/'. Así el historial del cliente vive en el CRM y no en
// carpetas sueltas del computador.

const RECEIPTS_BUCKET = 'receipts';

export async function uploadElectricityBill(
  bytes: ArrayBuffer, nombreOriginal: string, contentType: string,
): Promise<string> {
  const db = getSupabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);
  const safe = nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'boleta';
  const path = `boletas-luz/${day}/${crypto.randomUUID()}_${safe}`;
  const { error } = await db.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function getBillSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function deleteBillFile(path: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.storage.from(RECEIPTS_BUCKET).remove([path]);
}
