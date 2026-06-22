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

// Guarda (upsert por periodo) los campos manuales del F29 del mes.
export async function saveF29Period(periodo: string, formData: FormData) {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: 'Periodo inválido' };
  const db = getSupabaseAdmin();

  const { error } = await db.from('f29_periods').upsert({
    periodo,
    remanente_anterior:   num(formData.get('remanente_anterior')),
    ppm_base:             num(formData.get('ppm_base')),
    ppm_tasa:             parseFloat(String(formData.get('ppm_tasa') ?? '0').replace(',', '.')) || 0,
    ppm_neto:             num(formData.get('ppm_neto')),
    retencion_honorarios: num(formData.get('retencion_honorarios')),
    otros_impuestos:      num(formData.get('otros_impuestos')),
    reajustes:            num(formData.get('reajustes')),
    multas:               num(formData.get('multas')),
    notas:                (formData.get('notas') as string) || null,
    revisado:             formData.get('revisado') === 'true',
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'periodo' });

  if (error) return { error: error.message };
  revalidatePath('/admin/finanzas');
  return { ok: true };
}
