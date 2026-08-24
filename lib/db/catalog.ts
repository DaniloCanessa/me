import { getSupabaseAdmin } from '@/lib/supabase';
import { KIT_CATALOG, requiredSurfaceM2 } from '@/lib/constants';
import type { SolarKit, SolarPanel } from '@/lib/types';

interface PanelRel {
  id: string;
  nombre: string;
  potencia_w: number;
  peso_kg: number | string | null;
  ancho_mm: number;
  largo_mm: number;
  espesor_mm: number | null;
}

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
  // PostgREST devuelve la relación como objeto o como arreglo de un elemento
  // según cómo infiera la cardinalidad; se normaliza al leer.
  solar_panels: PanelRel | PanelRel[] | null;
}

function relToPanel(rel: ProductRow['solar_panels']): SolarPanel | undefined {
  const r = Array.isArray(rel) ? rel[0] : rel;
  if (!r) return undefined;
  return {
    id:        r.id,
    nombre:    r.nombre,
    potenciaW: r.potencia_w,
    pesoKg:    r.peso_kg == null ? null : Number(r.peso_kg),
    anchoMm:   r.ancho_mm,
    largoMm:   r.largo_mm,
    espesorMm: r.espesor_mm,
  };
}

function rowToKit(row: ProductRow): SolarKit {
  const panel = relToPanel(row.solar_panels);
  const nominalKWp = row.specs.sizekWp;
  const panelCount = row.specs.panelCount;

  // La potencia REAL manda en todo lo que se calcula. El número del nombre
  // comercial puede haber quedado atrás: el kit "8,8 kW" son hoy 12 paneles de
  // 700 W = 8,4 kWp. Sin panel asignado no hay de dónde derivarla y se cae al
  // valor declarado, que es lo único disponible.
  const sizekWp = panel
    ? Math.round((panelCount * panel.potenciaW) / 10) / 100
    : nominalKWp;

  return {
    id:                row.sku,
    sizekWp,
    nominalKWp,
    panel,
    includesBattery:   row.specs.includesBattery ?? false,
    batteryCapacityKWh: row.specs.batteryCapacityKWh,
    panelCount,
    // `specs.areaM2` se conserva como respaldo, pero con panel asignado la
    // superficie se calcula con sus medidas reales en vez de un número tecleado.
    estimatedAreaM2:   panel ? requiredSurfaceM2(panelCount, panel) : row.specs.areaM2,
    priceReferenceCLP: row.base_price_clp,
  };
}

const COLUMNAS_BASE = 'id, sku, name, specs, base_price_clp, sort_order';
const COLUMNAS_PANEL =
  'solar_panels ( id, nombre, potencia_w, peso_kg, ancho_mm, largo_mm, espesor_mm )';

export async function getResidentialCatalog(): Promise<SolarKit[]> {
  try {
    const db = getSupabaseAdmin();
    const consultar = (columnas: string) =>
      db.from('products')
        .select(columnas)
        .eq('category', 'solar_kit')
        .in('customer_type', ['residential', 'both'])
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    let { data, error } = await consultar(`${COLUMNAS_BASE}, ${COLUMNAS_PANEL}`);

    // Si la migración de paneles todavía no corrió, la relación no existe y la
    // consulta falla entera. Sin este reintento el catálogo caería al respaldo
    // en código, que tiene PRECIOS DISTINTOS a los de la base: entre desplegar
    // y correr la migración se cotizaría con valores viejos sin que se note.
    if (error) ({ data, error } = await consultar(COLUMNAS_BASE));

    if (error || !data?.length) return KIT_CATALOG;

    return (data as unknown as ProductRow[]).map(rowToKit);
  } catch {
    return KIT_CATALOG;
  }
}
