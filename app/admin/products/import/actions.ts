'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface ImportRow {
  name: string;
  sku: string;
  category: string;
  customer_type: string;
  costo_proveedor_clp: number;
  margen_pct: number | null;
  base_price_clp: number;
  installation_price_clp: number;
  stock: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  errors: { sku: string; message: string }[];
}

export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  const db = getSupabaseAdmin();
  let inserted = 0;
  let updated = 0;
  const errors: { sku: string; message: string }[] = [];

  // Upsert en lotes de 50
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    const { data, error } = await db
      .from('products')
      .upsert(
        batch.map((r) => ({ ...r, specs: {}, updated_at: new Date().toISOString() })),
        { onConflict: 'sku', ignoreDuplicates: false }
      )
      .select('id');

    if (error) {
      batch.forEach((r) => errors.push({ sku: r.sku, message: error.message }));
    } else {
      // Supabase upsert no distingue insert vs update; aproximamos con el total
      inserted += data?.length ?? batch.length;
    }
  }

  revalidatePath('/admin/products');
  return { inserted, updated, errors };
}
