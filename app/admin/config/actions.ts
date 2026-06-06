'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateConfigParam(id: string, rawValue: string) {
  const db = getSupabaseAdmin();

  // Las categorías 'whatsapp' y 'social' guardan texto; el resto exige valor numérico
  const { data: param } = await db
    .from('config_parameters')
    .select('key, category')
    .eq('id', id)
    .single();

  const isText = param?.category === 'whatsapp' || param?.category === 'social';
  let value: string | number;

  if (isText) {
    const trimmed = rawValue.trim();
    if (param?.category === 'social') {
      // Vacío = ocultar esa red en el footer; si hay valor, debe ser URL
      if (trimmed && !/^https?:\/\/.+/.test(trimmed)) {
        return { error: 'Debe ser una URL completa (https://...) o vacío para ocultar la red' };
      }
    } else {
      if (!trimmed) return { error: 'El valor no puede estar vacío' };
      if (param?.key === 'whatsapp.number' && !/^\d{8,15}$/.test(trimmed)) {
        return { error: 'Número inválido: solo dígitos con código de país, sin "+" (ej: 56912345678)' };
      }
    }
    value = trimmed;
  } else {
    const n = parseFloat(rawValue);
    if (isNaN(n)) return { error: 'Valor numérico no válido' };
    value = n;
  }

  const { error } = await db
    .from('config_parameters')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/config');
  // El botón de WhatsApp vive en las páginas públicas de landing
  if (isText) revalidatePath('/', 'layout');
  return { ok: true };
}
