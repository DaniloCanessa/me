import { getSupabaseAdmin } from '@/lib/supabase';
import type { SolarPanel } from '@/lib/types';

// ─── Catálogo de paneles ─────────────────────────────────────────────────────
//
// Un panel es una entidad propia porque la tecnología avanza rápido: se pasó de
// 550 W a 700 W y vendrán más. Antes la potencia del kit se escribía a mano y
// podía contradecir a sus propios componentes; ahora se deriva del panel.
//
// Las medidas se guardan en milímetros porque así vienen en la ficha técnica
// del fabricante; el cálculo de superficie las pasa a metros.

interface PanelRow {
  id: string;
  nombre: string;
  potencia_w: number;
  peso_kg: number | string | null;
  ancho_mm: number;
  largo_mm: number;
  espesor_mm: number | null;
}

function rowToPanel(row: PanelRow): SolarPanel {
  return {
    id:        row.id,
    nombre:    row.nombre,
    potenciaW: row.potencia_w,
    // numeric de Postgres llega como string por PostgREST.
    pesoKg:    row.peso_kg == null ? null : Number(row.peso_kg),
    anchoMm:   row.ancho_mm,
    largoMm:   row.largo_mm,
    espesorMm: row.espesor_mm,
  };
}

export const PANEL_COLUMNS = 'id, nombre, potencia_w, peso_kg, ancho_mm, largo_mm, espesor_mm';

/** Paneles activos, de menor a mayor potencia — el orden de las columnas de la
 *  matriz de asignación. */
export async function getPanels(): Promise<SolarPanel[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('solar_panels')
    .select(PANEL_COLUMNS)
    .eq('is_active', true)
    .order('potencia_w', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) throw new Error(`No se pudo leer el catálogo de paneles: ${error.message}`);
  return (data as PanelRow[]).map(rowToPanel);
}

export type PanelInput = {
  nombre: string;
  potenciaW: number;
  pesoKg: number | null;
  anchoMm: number;
  largoMm: number;
  espesorMm: number | null;
};

function toRow(input: PanelInput) {
  return {
    nombre:     input.nombre.trim(),
    potencia_w: input.potenciaW,
    peso_kg:    input.pesoKg,
    ancho_mm:   input.anchoMm,
    largo_mm:   input.largoMm,
    espesor_mm: input.espesorMm,
  };
}

export async function createPanel(input: PanelInput): Promise<SolarPanel> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('solar_panels')
    .insert(toRow(input))
    .select(PANEL_COLUMNS)
    .single();

  if (error) {
    // El índice único es por (nombre, potencia): el mismo modelo repetido.
    if (error.code === '23505') {
      throw new Error(`Ya existe un panel "${input.nombre}" de ${input.potenciaW} W.`);
    }
    throw new Error(`No se pudo crear el panel: ${error.message}`);
  }
  return rowToPanel(data as PanelRow);
}

export async function updatePanel(id: string, input: PanelInput): Promise<SolarPanel> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('solar_panels')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PANEL_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Ya existe un panel "${input.nombre}" de ${input.potenciaW} W.`);
    }
    throw new Error(`No se pudo actualizar el panel: ${error.message}`);
  }
  return rowToPanel(data as PanelRow);
}

/** Kits que usan este panel. Se consulta ANTES de borrar: la FK sola impide el
 *  borrado pero no dice cuáles hay que reasignar, y esa es justo la información
 *  que necesita quien está intentando limpiar el catálogo. */
export async function getKitsUsingPanel(panelId: string): Promise<string[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('products')
    .select('name, sku')
    .eq('panel_id', panelId)
    .eq('category', 'solar_kit');

  if (error) throw new Error(`No se pudo verificar el uso del panel: ${error.message}`);
  return (data as Array<{ name: string; sku: string }>).map((r) => r.name || r.sku);
}

export async function deletePanel(id: string): Promise<void> {
  const enUso = await getKitsUsingPanel(id);
  if (enUso.length > 0) {
    throw new Error(
      `No se puede eliminar: ${enUso.length} kit${enUso.length > 1 ? 's lo usan' : ' lo usa'} ` +
      `(${enUso.join(', ')}). Asígnalos a otro panel primero para que no queden sin panel.`,
    );
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from('solar_panels').delete().eq('id', id);
  if (error) throw new Error(`No se pudo eliminar el panel: ${error.message}`);
}

/** Asigna un panel a un kit. Un kit tiene exactamente un panel, así que esto
 *  reemplaza al anterior — la matriz usa checkboxes pero se comporta de forma
 *  exclusiva por fila. */
export async function assignPanelToKit(kitId: string, panelId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('products')
    .update({ panel_id: panelId, updated_at: new Date().toISOString() })
    .eq('id', kitId)
    .eq('category', 'solar_kit');

  if (error) throw new Error(`No se pudo asignar el panel: ${error.message}`);
}

/** Kits solares con su panel, para la matriz de asignación. */
export type KitConPanel = {
  id: string;
  sku: string;
  nombre: string;
  panelCount: number;
  nominalKWp: number;
  panelId: string | null;
};

export async function getKitsForMatrix(): Promise<KitConPanel[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('products')
    .select('id, sku, name, specs, panel_id, sort_order')
    .eq('category', 'solar_kit')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`No se pudieron leer los kits: ${error.message}`);

  return (data as Array<{
    id: string; sku: string; name: string; panel_id: string | null;
    specs: { sizekWp?: number; panelCount?: number };
  }>).map((r) => ({
    id:         r.id,
    sku:        r.sku,
    nombre:     r.name || r.sku,
    panelCount: r.specs?.panelCount ?? 0,
    nominalKWp: r.specs?.sizekWp ?? 0,
    panelId:    r.panel_id,
  }));
}
