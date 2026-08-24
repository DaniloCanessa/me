'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { requiredSurfaceM2 } from '@/lib/constants';
import type { SolarPanel } from '@/lib/types';

/** Panel asociado al kit, para derivar la superficie al guardar. */
async function panelDeKit(productId: string | null): Promise<SolarPanel | null> {
  if (!productId) return null;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('products')
    .select('solar_panels ( id, nombre, potencia_w, peso_kg, ancho_mm, largo_mm, espesor_mm )')
    .eq('id', productId)
    .single();
  const rel = (data as { solar_panels?: unknown } | null)?.solar_panels;
  const r = (Array.isArray(rel) ? rel[0] : rel) as Record<string, number | string | null> | undefined;
  if (!r) return null;
  return {
    id: String(r.id), nombre: String(r.nombre), potenciaW: Number(r.potencia_w),
    pesoKg: r.peso_kg == null ? null : Number(r.peso_kg),
    anchoMm: Number(r.ancho_mm), largoMm: Number(r.largo_mm),
    espesorMm: r.espesor_mm == null ? null : Number(r.espesor_mm),
  };
}

function buildSpecs(formData: FormData, category: string, panel?: SolarPanel | null) {
  if (category === 'solar_kit') {
    const panelCount = parseInt(formData.get('panelCount') as string) || 0;
    return {
      // El kWp del formulario es el del NOMBRE COMERCIAL. La potencia real se
      // deriva del panel al leer el catálogo, no se guarda duplicada aquí.
      sizekWp:          parseFloat(formData.get('sizekWp') as string) || 0,
      panelCount,
      // La superficie deja de tecleare: sale de las medidas del panel. Sin
      // panel asignado cae a las de un 550 W, que es el respaldo histórico.
      areaM2:           requiredSurfaceM2(panelCount, panel),
      includesBattery:  formData.get('includesBattery') === 'true',
      batteryCapacityKWh: formData.get('batteryCapacityKWh')
        ? parseFloat(formData.get('batteryCapacityKWh') as string)
        : undefined,
    };
  }
  if (category === 'battery') {
    return {
      capacityKWh:      parseFloat(formData.get('capacityKWh') as string) || 0,
      usableFraction:   parseFloat(formData.get('usableFraction') as string) || 0.7,
      cycleEfficiency:  parseFloat(formData.get('cycleEfficiency') as string) || 0.8,
    };
  }
  return {};
}

export async function createProduct(formData: FormData) {
  const category = formData.get('category') as string;
  const db = getSupabaseAdmin();

  const margenRaw = formData.get('margen_pct') as string;
  const { error } = await db.from('products').insert({
    name:                   formData.get('name') as string,
    sku:                    formData.get('sku') as string,
    category,
    customer_type:          formData.get('customer_type') as string,
    proveedor:              (formData.get('proveedor') as string) || null,
    specs:                  buildSpecs(formData, category, null),
    costo_proveedor_clp:    parseFloat(formData.get('costo_proveedor_clp') as string) || 0,
    margen_pct:             margenRaw ? parseFloat(margenRaw) : null,
    base_price_clp:         parseFloat(formData.get('base_price_clp') as string) || 0,
    installation_price_clp: parseFloat(formData.get('installation_price_clp') as string) || 0,
    stock:                  parseInt(formData.get('stock') as string) || 0,
    is_active:              formData.get('is_active') === 'true',
    sort_order:             parseInt(formData.get('sort_order') as string) || 0,
    notes:                  (formData.get('notes') as string) || null,
  });

  if (error) return { error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const category = formData.get('category') as string;
  const db = getSupabaseAdmin();

  const margenRaw = formData.get('margen_pct') as string;
  const panel = category === 'solar_kit' ? await panelDeKit(id) : null;
  const { error } = await db.from('products').update({
    name:                   formData.get('name') as string,
    sku:                    formData.get('sku') as string,
    category,
    customer_type:          formData.get('customer_type') as string,
    proveedor:              (formData.get('proveedor') as string) || null,
    specs:                  buildSpecs(formData, category, panel),
    costo_proveedor_clp:    parseFloat(formData.get('costo_proveedor_clp') as string) || 0,
    margen_pct:             margenRaw ? parseFloat(margenRaw) : null,
    base_price_clp:         parseFloat(formData.get('base_price_clp') as string) || 0,
    installation_price_clp: parseFloat(formData.get('installation_price_clp') as string) || 0,
    stock:                  parseInt(formData.get('stock') as string) || 0,
    is_active:              formData.get('is_active') === 'true',
    sort_order:             parseInt(formData.get('sort_order') as string) || 0,
    notes:                  (formData.get('notes') as string) || null,
    updated_at:             new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function toggleProductActive(id: string, isActive: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function getProductById(id: string) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('products').select('*').eq('id', id).single();
  return data;
}

export async function deleteProduct(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}
