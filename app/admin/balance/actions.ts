'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';

function num(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (s === '') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
}

// Guarda los saldos de apertura del ejercicio (upsert por año).
export async function saveBalanceConfig(anio: number, formData: FormData) {
  if (!Number.isInteger(anio)) return { error: 'Año inválido' };
  const db = getSupabaseAdmin();
  const { error } = await db.from('balance_config').upsert({
    anio,
    capital_social:             num(formData.get('capital_social')),
    aportes_socio:              num(formData.get('aportes_socio')),
    perdida_acumulada_anterior: num(formData.get('perdida_acumulada_anterior')),
    caja_inicial:               num(formData.get('caja_inicial')),
    notas:                      (formData.get('notas') as string) || null,
    updated_at:                 new Date().toISOString(),
  }, { onConflict: 'anio' });
  if (error) return { error: error.message };
  revalidatePath('/admin/balance');
  return { ok: true };
}

export async function addHonorario(formData: FormData) {
  const bruto = num(formData.get('monto_bruto'));
  if (bruto <= 0) return { error: 'Ingresa el monto bruto' };
  const retencion = num(formData.get('retencion'));
  const fecha = (formData.get('fecha') as string) || new Date().toISOString().slice(0, 10);
  const periodo = fecha.slice(0, 7);

  const db = getSupabaseAdmin();
  const { error } = await db.from('honorarios').insert({
    periodo, fecha,
    emisor:  (formData.get('emisor') as string) || null,
    rut:     (formData.get('rut') as string) || null,
    folio:   (formData.get('folio') as string) || null,
    monto_bruto: bruto, retencion, monto_liquido: bruto - retencion,
    glosa:   (formData.get('glosa') as string) || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/balance');
  return { ok: true };
}

export async function deleteHonorario(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('honorarios').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/balance');
  return { ok: true };
}
