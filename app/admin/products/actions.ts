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
    marca:                  ((formData.get('marca') as string) || '').trim() || null,
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
    marca:                  ((formData.get('marca') as string) || '').trim() || null,
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

/**
 * "✓ Precio vigente": confirma que el costo del proveedor sigue igual.
 * Solo mueve la fecha de verificación; no toca ningún precio.
 */
export async function verifyProductCosts(ids: string[]) {
  if (!ids.length) return { ok: true, at: null as string | null };
  const db = getSupabaseAdmin();
  const at = new Date().toISOString();
  const { error } = await db.from('products').update({ costo_verificado_at: at }).in('id', ids);
  if (error) return { error: error.message, at: null as string | null };
  revalidatePath('/admin/products');
  return { ok: true, at };
}

/**
 * Duplica productos. La copia lleva "(copia)" en el nombre, un SKU nuevo
 * (SKU-COPIA, SKU-COPIA-2…), stock 0 para no inflar el inventario y queda
 * INACTIVA para que no aparezca en el simulador hasta que se revise.
 */
export async function duplicateProducts(ids: string[]) {
  if (!ids.length) return { created: [] as Record<string, unknown>[] };
  const db = getSupabaseAdmin();

  const { data: originals, error } = await db.from('products').select('*').in('id', ids);
  if (error) return { error: error.message, created: [] as Record<string, unknown>[] };

  // SKUs ya usados, para no chocar con el índice único de sku
  const { data: skuRows } = await db.from('products').select('sku').ilike('sku', '%-COPIA%');
  const usados = new Set((skuRows ?? []).map((r) => String(r.sku).toUpperCase()));

  const copias = (originals ?? []).map((o) => {
    const { id: _id, created_at: _c, updated_at: _u, ...resto } = o as Record<string, unknown>;
    void _id; void _c; void _u;
    const base = `${String(o.sku)}-COPIA`;
    let sku = base;
    for (let n = 2; usados.has(sku.toUpperCase()); n++) sku = `${base}-${n}`;
    usados.add(sku.toUpperCase());
    return { ...resto, name: `${String(o.name)} (copia)`, sku, stock: 0, is_active: false };
  });

  const { data: created, error: insErr } = await db.from('products').insert(copias).select('*');
  if (insErr) return { error: insErr.message, created: [] as Record<string, unknown>[] };

  revalidatePath('/admin/products');
  return { created: (created ?? []) as Record<string, unknown>[] };
}

/**
 * Elimina varios productos. Primero intenta en un solo paso; si la base lo
 * rechaza (ej. un producto usado en una cotización), borra uno por uno para
 * eliminar los que se pueda e informar cuáles no.
 */
export async function deleteProducts(ids: string[]) {
  if (!ids.length) return { deleted: 0, failed: [] as string[] };
  const db = getSupabaseAdmin();

  const { error } = await db.from('products').delete().in('id', ids);
  if (!error) {
    revalidatePath('/admin/products');
    return { deleted: ids.length, failed: [] as string[] };
  }

  let deleted = 0;
  const failed: string[] = [];
  for (const id of ids) {
    const { error: e } = await db.from('products').delete().eq('id', id);
    if (e) failed.push(id); else deleted++;
  }
  revalidatePath('/admin/products');
  return { deleted, failed };
}
