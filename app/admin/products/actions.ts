'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

function buildSpecs(formData: FormData, category: string) {
  if (category === 'solar_kit') {
    return {
      sizekWp:          parseFloat(formData.get('sizekWp') as string) || 0,
      panelCount:       parseInt(formData.get('panelCount') as string) || 0,
      areaM2:           parseFloat(formData.get('areaM2') as string) || 0,
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
    specs:                  buildSpecs(formData, category),
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
  const { error } = await db.from('products').update({
    name:                   formData.get('name') as string,
    sku:                    formData.get('sku') as string,
    category,
    customer_type:          formData.get('customer_type') as string,
    specs:                  buildSpecs(formData, category),
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

export async function deleteProduct(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}
