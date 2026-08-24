'use server';

import { revalidatePath } from 'next/cache';
import { getAdminUser } from '@/lib/auth';
import {
  createPanel, updatePanel, deletePanel, assignPanelToKit, type PanelInput,
} from '@/lib/db/panels';

// ─── Acciones del catálogo de paneles ────────────────────────────────────────
//
// Todas devuelven { error } en vez de lanzar: los mensajes de la capa de datos
// están escritos para leerse en pantalla (sobre todo el de "no se puede
// eliminar", que nombra los kits a reasignar).

type Resultado = { ok?: true; error?: string };

function num(v: FormDataEntryValue | null): number {
  const s = String(v ?? '').replace(',', '.').replace(/[^\d.]/g, '');
  return s === '' ? 0 : parseFloat(s);
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = num(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function leerFormulario(fd: FormData): { input?: PanelInput; error?: string } {
  const nombre     = String(fd.get('nombre') ?? '').trim();
  const potenciaW  = Math.round(num(fd.get('potenciaW')));
  const anchoMm    = Math.round(num(fd.get('anchoMm')));
  const largoMm    = Math.round(num(fd.get('largoMm')));
  const espesorMm  = numOrNull(fd.get('espesorMm'));
  const pesoKg     = numOrNull(fd.get('pesoKg'));

  if (!nombre)      return { error: 'Falta la marca o el modelo del panel.' };
  if (!potenciaW)   return { error: 'Falta la potencia del panel (W).' };
  if (!anchoMm)     return { error: 'Falta el ancho del panel (mm).' };
  if (!largoMm)     return { error: 'Falta el largo del panel (mm).' };

  // Un panel de 700 W mide ~2.400 mm; uno de 0,7 m no existe. Atrapa el caso
  // de haber escrito metros donde se piden milímetros.
  if (anchoMm < 100 || largoMm < 100) {
    return { error: 'Las medidas van en milímetros (un panel mide ~2.384 × 1.303 mm).' };
  }

  return {
    input: {
      nombre,
      potenciaW,
      pesoKg,
      anchoMm: Math.min(anchoMm, largoMm),   // el ancho es siempre el lado menor
      largoMm: Math.max(anchoMm, largoMm),
      espesorMm: espesorMm == null ? null : Math.round(espesorMm),
    },
  };
}

export async function guardarPanel(fd: FormData): Promise<Resultado> {
  if (!(await getAdminUser())) return { error: 'Sesión expirada.' };

  const { input, error } = leerFormulario(fd);
  if (error || !input) return { error };

  const id = String(fd.get('id') ?? '').trim();

  try {
    if (id) await updatePanel(id, input);
    else    await createPanel(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar el panel.' };
  }

  revalidatePath('/admin/paneles');
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function eliminarPanel(id: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { error: 'Sesión expirada.' };

  try {
    await deletePanel(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo eliminar el panel.' };
  }

  revalidatePath('/admin/paneles');
  revalidatePath('/admin/products');
  return { ok: true };
}

/** Un kit tiene exactamente un panel: asignar uno reemplaza al anterior. */
export async function asignarPanel(kitId: string, panelId: string): Promise<Resultado> {
  if (!(await getAdminUser())) return { error: 'Sesión expirada.' };

  try {
    await assignPanelToKit(kitId, panelId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo asignar el panel.' };
  }

  revalidatePath('/admin/paneles');
  revalidatePath('/admin/products');
  revalidatePath('/admin/simulator');
  return { ok: true };
}
