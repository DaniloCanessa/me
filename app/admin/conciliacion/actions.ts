'use server';

import { revalidatePath } from 'next/cache';
import { importRcv } from '@/lib/db/sii';

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
  return { ok: true, kind: res.kind, count: res.count };
}
