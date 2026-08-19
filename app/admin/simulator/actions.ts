'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAdminUser } from '@/lib/auth';
import { findSimulacionDeLaMismaBoleta, type SimulacionPrevia } from '@/lib/db/simulations';
import type { SimulationClientData } from '@/app/admin/quotes/actions';

// ─── Guardar una simulación ──────────────────────────────────────────────────
//
// Guardar es explícito (no ocurre al llegar a resultados) para que las pruebas
// exploratorias no ensucien el CRM. Al guardar:
//   · Si el cliente no existe, se crea — junto con su instalación.
//   · Si ya existe, solo se agrega la simulación y se enriquece su ficha.
//   · Las boletas subidas quedan archivadas y enlazadas a la simulación.
// Corregir una simulación NO la sobrescribe: se guarda una nueva con su propia
// fecha y hora, y queda apuntando a la que corrige.

export type BoletaArchivada = {
  filePath: string;
  fileName?: string | null;
  contentType?: string | null;
  fechaBoleta?: string | null;
  numeroBoleta?: string | null;
  distribuidora?: string | null;
  ocrJson?: unknown;
};

export type GuardarSimulacionPayload = {
  clientId?: string;
  installationId?: string | null;
  clientData: SimulationClientData;

  fechaBoleta?: string | null;
  numeroBoleta?: string | null;

  escenario: string;
  kitSizeKWp: number;
  panelCount: number;
  systemCostCLP: number;
  batteryKWh?: number;
  annualBenefitCLP: number;
  paybackYears: number;
  billSavingsPercent: number;
  averageMonthlyKWh: number;

  inputJson: unknown;
  resultJson: unknown;

  boletas?: BoletaArchivada[];
  /** Id de la simulación que esta corrige, si viene de reabrir una. */
  corrigeId?: string | null;
  notas?: string | null;
  /** true = ya se avisó del duplicado y el usuario decidió guardar igual. */
  confirmarDuplicado?: boolean;
};

export type GuardarSimulacionResult = {
  ok?: boolean;
  simulationId?: string;
  clientId?: string;
  error?: string;
  /** Se devuelve cuando esa boleta ya se simuló y falta confirmación. */
  duplicada?: SimulacionPrevia;
};

const norm = (s: string) => s.trim().toLowerCase();

export async function guardarSimulacion(p: GuardarSimulacionPayload): Promise<GuardarSimulacionResult> {
  const db = getSupabaseAdmin();
  const d = p.clientData;
  if (!d?.nombre?.trim()) return { error: 'Falta el nombre del cliente' };

  // ── Cliente ────────────────────────────────────────────────────────────────
  let clientId = p.clientId ?? null;
  if (!clientId) {
    // Mismo criterio anti-duplicados que la cotización: primero por email, que
    // es lo más confiable, y si no por nombre exacto.
    const { data: existentes } = await db.from('clients').select('id, nombre, email');
    const match = ((existentes ?? []) as Array<{ id: string; nombre: string; email: string | null }>)
      .find((c) =>
        (d.email && c.email && norm(c.email) === norm(d.email)) ||
        norm(c.nombre) === norm(d.nombre));
    if (match) clientId = match.id;
  }

  if (!clientId) {
    const { data: nuevo, error } = await db.from('clients').insert({
      nombre:     d.nombre,
      empresa:    d.empresa ?? null,
      atencion_a: d.atencionA ?? null,
      email:      d.email || null,
      telefono:   d.telefono || null,
      ciudad:     d.ciudad || null,
      source:     'simulador',
    }).select('id').single();
    if (error) return { error: 'No se pudo crear el cliente: ' + error.message };
    clientId = nuevo.id as string;
  }

  // ── Instalación ────────────────────────────────────────────────────────────
  let installationId = p.installationId ?? null;
  const datosInstalacion = {
    direccion:                    d.direccion || null,
    comuna:                       d.comuna || null,
    ciudad:                       d.ciudad || null,
    region_id:                    d.regionId || null,
    customer_type:                d.customerType,
    distribuidora:                d.distribuidora || null,
    tarifa:                       d.tarifa || null,
    amperaje_a:                   d.amperajeA ?? null,
    potencia_contratada_kw:       d.potenciaContratadaKW ?? null,
    tension_suministro:           d.tensionSuministro ?? null,
    consumo_promedio_mensual_kwh: d.consumoPromedioMensualKWh ?? null,
    updated_at:                   new Date().toISOString(),
  };

  if (!installationId) {
    // Antes de crear una nueva se busca entre las del cliente por dirección
    // (o comuna+región), para no duplicar la misma casa.
    const { data: suyas } = await db.from('installations')
      .select('id, direccion, comuna, region_id')
      .eq('client_id', clientId).eq('is_active', true);
    const n = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
    const match = ((suyas ?? []) as Array<{ id: string; direccion: string | null; comuna: string | null; region_id: string | null }>)
      .find((i) =>
        (d.direccion && n(i.direccion) === n(d.direccion)) ||
        (!d.direccion && !!d.comuna && n(i.comuna) === n(d.comuna) && n(i.region_id) === n(d.regionId)));
    if (match) installationId = match.id;
  }

  if (installationId) {
    await db.from('installations').update(datosInstalacion).eq('id', installationId);
  } else {
    const { data: inst } = await db.from('installations').insert({
      client_id: clientId,
      nombre_instalacion: d.direccion || (d.customerType === 'business' ? 'Instalación principal' : 'Casa'),
      is_active: true,
      ...datosInstalacion,
    }).select('id').single();
    installationId = (inst?.id as string) ?? null;
  }

  // ── ¿Esta boleta ya se simuló? ─────────────────────────────────────────────
  if (!p.confirmarDuplicado) {
    const previa = await findSimulacionDeLaMismaBoleta({
      clientId, installationId,
      fechaBoleta: p.fechaBoleta, numeroBoleta: p.numeroBoleta,
    });
    if (previa) return { duplicada: previa, clientId };
  }

  // ── Simulación ─────────────────────────────────────────────────────────────
  const user = await getAdminUser();
  const { data: sim, error: errSim } = await db.from('simulations').insert({
    client_id:            clientId,
    installation_id:      installationId,
    fecha_simulacion:     new Date().toISOString(),
    fecha_boleta:         p.fechaBoleta || null,
    numero_boleta:        p.numeroBoleta || null,
    direccion:            d.direccion || null,
    comuna:               d.comuna || null,
    region_id:            d.regionId || null,
    customer_type:        d.customerType,
    escenario:            p.escenario,
    kit_size_kwp:         p.kitSizeKWp,
    panel_count:          p.panelCount,
    system_cost_clp:      p.systemCostCLP,
    battery_kwh:          p.batteryKWh ?? 0,
    annual_benefit_clp:   p.annualBenefitCLP,
    payback_years:        p.paybackYears,
    bill_savings_percent: p.billSavingsPercent,
    average_monthly_kwh:  p.averageMonthlyKWh,
    input_json:           p.inputJson ?? null,
    result_json:          p.resultJson ?? null,
    corrige_id:           p.corrigeId ?? null,
    notas:                p.notas ?? null,
    created_by:           user?.name ?? user?.email ?? null,
  }).select('id').single();
  if (errSim) return { error: 'No se pudo guardar la simulación: ' + errSim.message };

  const simulationId = sim.id as string;

  // ── Boletas archivadas ─────────────────────────────────────────────────────
  if (p.boletas?.length) {
    const filas = p.boletas.filter((b) => b.filePath).map((b) => ({
      simulation_id:   simulationId,
      client_id:       clientId,
      installation_id: installationId,
      file_path:       b.filePath,
      file_name:       b.fileName ?? null,
      content_type:    b.contentType ?? null,
      fecha_boleta:    b.fechaBoleta ?? p.fechaBoleta ?? null,
      numero_boleta:   b.numeroBoleta ?? p.numeroBoleta ?? null,
      distribuidora:   b.distribuidora ?? null,
      ocr_json:        b.ocrJson ?? null,
      created_by:      user?.name ?? user?.email ?? null,
    }));
    if (filas.length) {
      // Si falla el archivado la simulación igual queda guardada: perder el
      // respaldo del PDF no debe borrar el trabajo.
      const { error } = await db.from('simulation_bills').insert(filas);
      if (error) console.error('[guardarSimulacion] no se archivaron las boletas:', error.message);
    }
  }

  revalidatePath('/admin/clients');
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, simulationId, clientId };
}
