import { getSupabaseAdmin } from '@/lib/supabase';
import { KIT_CATALOG } from '@/lib/constants';
import type { SolarKit } from '@/lib/types';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  specs: {
    sizekWp: number;
    panelCount: number;
    areaM2: number;
    includesBattery: boolean;
    batteryCapacityKWh?: number;
  };
  base_price_clp: number;
  sort_order: number;
}

function rowToKit(row: ProductRow): SolarKit {
  return {
    id:                row.sku,
    sizekWp:           row.specs.sizekWp,
    includesBattery:   row.specs.includesBattery ?? false,
    batteryCapacityKWh: row.specs.batteryCapacityKWh,
    panelCount:        row.specs.panelCount,
    estimatedAreaM2:   row.specs.areaM2,
    priceReferenceCLP: row.base_price_clp,
  };
}

export async function getResidentialCatalog(): Promise<SolarKit[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('products')
      .select('id, sku, name, specs, base_price_clp, sort_order')
      .eq('category', 'solar_kit')
      .in('customer_type', ['residential', 'both'])
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data?.length) return KIT_CATALOG;

    return (data as ProductRow[]).map(rowToKit);
  } catch {
    return KIT_CATALOG;
  }
}
