'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteQuotes(ids: string[]) {
  if (!ids.length) return { ok: true };
  const db = getSupabaseAdmin();
  const { error } = await db.from('quotes').delete().in('id', ids);
  if (error) return { error: error.message };
  revalidatePath('/admin/quotes');
  return { ok: true };
}

export async function createQuote(clientId: string, installationId?: string) {
  const db = getSupabaseAdmin();

  const { data: client } = await db
    .from('clients')
    .select('nombre, email, telefono, rut, atencion_a')
    .eq('id', clientId)
    .single();

  if (!client) return { error: 'Cliente no encontrado' };

  const { data: quote, error } = await db
    .from('quotes')
    .insert({
      client_id:       clientId,
      installation_id: installationId ?? null,
      status:          'draft',
      client_name:     client.nombre,
      client_email:    client.email ?? '',
      client_phone:    client.telefono ?? null,
      client_rut:      client.rut ?? null,
      client_atencion: client.atencion_a ?? null,
      subtotal_clp:    0,
      discount_clp:    0,
      total_clp:       0,
      validity_days:   10,
      token:           crypto.randomUUID(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  redirect(`/admin/quotes/${quote.id}`);
}

export async function updateQuoteHeader(id: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('quotes').update({
    client_name:     formData.get('client_name') as string,
    client_email:    formData.get('client_email') as string,
    client_phone:    (formData.get('client_phone') as string) || null,
    client_rut:      (formData.get('client_rut') as string) || null,
    client_atencion: (formData.get('client_atencion') as string) || null,
    notes:           (formData.get('notes') as string) || null,
    client_notes:    (formData.get('client_notes') as string) || null,
    validity_days:   parseInt(formData.get('validity_days') as string) || 10,
    installation_id: (formData.get('installation_id') as string) || null,
    updated_at:      new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/quotes/${id}`);
  return { ok: true };
}

export async function updateQuoteStatus(id: string, status: string) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const extra: Record<string, string | null> = {};

  if (status === 'sent')     extra.sent_at = now;
  if (status === 'accepted') extra.accepted_at = now;
  if (status === 'rejected') extra.rejected_at = now;

  const { error } = await db.from('quotes').update({
    status, ...extra, updated_at: now,
  }).eq('id', id);

  if (error) return { error: error.message };

  // Sync lead status when quote is accepted or rejected
  if (status === 'accepted' || status === 'rejected') {
    const { data: quote } = await db.from('quotes').select('lead_id').eq('id', id).single();
    if (quote?.lead_id) {
      const leadStatus = status === 'accepted' ? 'won' : 'lost';
      const { data: lead } = await db.from('leads').select('status').eq('id', quote.lead_id).single();
      if (lead && lead.status !== leadStatus) {
        await db.from('leads').update({ status: leadStatus, updated_at: now }).eq('id', quote.lead_id);
        await db.from('lead_status_history').insert({
          lead_id:     quote.lead_id,
          from_status: lead.status,
          to_status:   leadStatus,
          created_at:  now,
        });
        revalidatePath(`/admin/leads/${quote.lead_id}`);
        revalidatePath('/admin/leads');
      }
    }
  }

  revalidatePath(`/admin/quotes/${id}`);
  revalidatePath('/admin/quotes');
  return { ok: true };
}

export async function upsertQuoteItem(quoteId: string, formData: FormData) {
  const db = getSupabaseAdmin();
  const itemId           = (formData.get('item_id') as string) || null;
  const costo            = parseFloat(formData.get('costo_proveedor_clp') as string) || 0;
  const margenRaw        = formData.get('margen_pct') as string;
  const margen           = margenRaw !== '' && margenRaw !== null ? parseFloat(margenRaw) : 30;
  const quantity         = parseFloat(formData.get('quantity') as string) || 1;
  const discount_percent = parseFloat(formData.get('discount_percent') as string) || 0;
  const directPriceIva   = parseFloat(formData.get('unit_price_direct') as string) || 0;

  // Modo precio directo (ítem libre): el usuario ingresa el precio final c/IVA
  const precio_neto_unit = directPriceIva > 0
    ? directPriceIva / 1.19
    : costo * (1 + margen / 100);
  const precio_con_iva   = precio_neto_unit * 1.19;
  const total_clp        = precio_con_iva * quantity * (1 - discount_percent / 100);

  const payload = {
    quote_id:            quoteId,
    product_id:          (formData.get('product_id') as string) || null,
    description:         formData.get('description') as string,
    quantity,
    costo_proveedor_clp: costo,
    margen_pct:          directPriceIva > 0 ? 0 : margen,
    unit_price_clp:      Math.round(precio_neto_unit),
    discount_percent,
    total_clp:           Math.round(total_clp),
    sort_order:          parseInt(formData.get('sort_order') as string) || 0,
  };

  let error;
  if (itemId) {
    ({ error } = await db.from('quote_items').update(payload).eq('id', itemId));
  } else {
    ({ error } = await db.from('quote_items').insert(payload));
  }

  if (error) return { error: error.message };
  await recalcTotals(quoteId);
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true };
}

export async function deleteQuoteItem(quoteId: string, itemId: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('quote_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  await recalcTotals(quoteId);
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true };
}

async function recalcTotals(quoteId: string) {
  const db = getSupabaseAdmin();
  const { data: items } = await db
    .from('quote_items')
    .select('quantity, unit_price_clp, discount_percent, total_clp')
    .eq('quote_id', quoteId);

  const subtotal_neto = (items ?? []).reduce((acc, item) => {
    return acc + item.unit_price_clp * item.quantity * (1 - item.discount_percent / 100);
  }, 0);

  const total_con_iva = Math.round(subtotal_neto * 1.19);

  await db.from('quotes').update({
    subtotal_clp: Math.round(subtotal_neto),
    total_clp:    total_con_iva,
    updated_at:   new Date().toISOString(),
  }).eq('id', quoteId);
}

export async function deleteQuote(id: string) {
  const db = getSupabaseAdmin();
  await db.from('quote_items').delete().eq('quote_id', id);
  const { error } = await db.from('quotes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/quotes');
  redirect('/admin/quotes');
}

// ─── Cotización creada desde el simulador ────────────────────────────────────
//
// Cierra el ciclo simular → cotizar: toma el escenario que el usuario tiene
// activo en los resultados y crea la cotización con ese kit ya cargado como
// ítem, para terminar de ajustarla (descuento, validez, notas) en el editor de
// siempre. Los precios del simulador son NETOS, igual que `unit_price_clp`.

// Datos del wizard que sirven para crear/actualizar la ficha del cliente.
export type SimulationClientData = {
  nombre: string;
  email: string;
  telefono: string;
  empresa?: string | null;
  atencionA?: string | null;
  customerType: 'natural' | 'business';
  direccion?: string | null;
  comuna?: string | null;
  ciudad?: string | null;
  regionId?: string | null;
  distribuidora?: string | null;
  tarifa?: string | null;
  amperajeA?: number | null;
  potenciaContratadaKW?: number | null;
  tensionSuministro?: 'BT' | 'AT' | null;
  consumoPromedioMensualKWh?: number | null;
};

export type SimulationQuotePayload = {
  /** Cliente existente del CRM. Si falta, se crea con `clientData`. */
  clientId?: string;
  installationId?: string | null;
  /** Datos del wizard: crean el cliente si es nuevo y enriquecen su ficha. */
  clientData?: SimulationClientData;
  escenario: string;              // 'A' | 'B' | 'C' (para la nota interna)
  escenarioLabel: string;         // texto legible del escenario
  kitSizeKWp: number;
  kitPanelCount: number;
  kitPriceNetoCLP: number;
  batteryKWh?: number;
  batteryModules?: number;
  batteryCostNetoCLP?: number;
  /** Resumen de la simulación, se archiva en la instalación. */
  simulationData?: Record<string, unknown>;
};

export async function createQuoteFromSimulation(p: SimulationQuotePayload) {
  const db = getSupabaseAdmin();
  const d = p.clientData;

  // ── Cliente ────────────────────────────────────────────────────────────────
  // Si la simulación no partió de una ficha, el cliente se crea AHORA y no
  // antes: simular no debe ensuciar el CRM; cotizar sí es un compromiso real.
  let clientId = p.clientId ?? null;
  if (!clientId) {
    if (!d?.nombre) return { error: 'Falta el nombre del cliente' };

    // Antes de crear: si escribió el nombre a mano en vez de elegirlo de la
    // lista, el cliente puede existir igual. Se busca por email (lo más
    // confiable) y, si no hay, por nombre exacto — así no se duplica la ficha.
    const { data: existentes } = await db.from('clients').select('id, nombre, email');
    const norm = (s: string) => s.trim().toLowerCase();
    const match = ((existentes ?? []) as Array<{ id: string; nombre: string; email: string | null }>)
      .find((c) =>
        (d.email && c.email && norm(c.email) === norm(d.email)) ||
        norm(c.nombre) === norm(d.nombre));
    if (match) clientId = match.id;
  }

  if (!clientId && d) {
    const { data: nuevo, error: errCliente } = await db.from('clients').insert({
      nombre:     d.nombre,
      empresa:    d.empresa ?? null,
      atencion_a: d.atencionA ?? null,
      email:      d.email || null,
      telefono:   d.telefono || null,
      ciudad:     d.ciudad || null,
      source:     'simulador',
    }).select('id').single();
    if (errCliente) return { error: 'No se pudo crear el cliente: ' + errCliente.message };
    clientId = nuevo.id as string;
  }

  const { data: client } = await db
    .from('clients')
    .select('nombre, email, telefono, rut, atencion_a')
    .eq('id', clientId)
    .single();
  if (!client) return { error: 'Cliente no encontrado' };

  // ── Instalación ────────────────────────────────────────────────────────────
  // Lo que se completó en el wizard vuelve a la ficha: así el CRM se enriquece
  // solo y la próxima simulación de este cliente ya arranca con los datos.
  let installationId = p.installationId ?? null;
  if (d) {
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
    // Si no se eligió instalación explícitamente, antes de crear una nueva se
    // busca entre las del cliente: sin esto, simular dos veces para la misma
    // casa deja la ficha con instalaciones duplicadas.
    if (!installationId) {
      const { data: suyas } = await db.from('installations')
        .select('id, direccion, comuna, region_id')
        .eq('client_id', clientId).eq('is_active', true);
      const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
      const match = ((suyas ?? []) as Array<{ id: string; direccion: string | null; comuna: string | null; region_id: string | null }>)
        .find((i) =>
          (d.direccion && norm(i.direccion) === norm(d.direccion)) ||
          (!d.direccion && !!d.comuna && norm(i.comuna) === norm(d.comuna) && norm(i.region_id) === norm(d.regionId)));
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
  }

  if (!p.kitPriceNetoCLP || p.kitPriceNetoCLP <= 0) {
    return { error: 'El escenario no tiene un precio válido' };
  }

  // Ítems: la planta siempre; la batería como línea aparte cuando el escenario
  // la incluye, para que el cliente vea qué está comprando.
  const items = [
    {
      description: `Planta fotovoltaica ${p.kitSizeKWp} kW on-grid — ${p.kitPanelCount} paneles`,
      neto: Math.round(p.kitPriceNetoCLP),
      sort_order: 0,
    },
  ];
  if (p.batteryCostNetoCLP && p.batteryCostNetoCLP > 0) {
    const mod = p.batteryModules ?? 0;
    items.push({
      description: `Banco de baterías ${p.batteryKWh ?? 0} kWh${mod ? ` — ${mod} módulo${mod > 1 ? 's' : ''}` : ''}`,
      neto: Math.round(p.batteryCostNetoCLP),
      sort_order: 1,
    });
  }

  const subtotalNeto = items.reduce((s, i) => s + i.neto, 0);
  const totalConIva  = Math.round(subtotalNeto * 1.19);

  const { data: quote, error } = await db
    .from('quotes')
    .insert({
      client_id:       clientId,
      installation_id: installationId,
      status:          'draft',
      client_name:     client.nombre,
      client_email:    client.email ?? '',
      client_phone:    client.telefono ?? null,
      client_rut:      client.rut ?? null,
      client_atencion: client.atencion_a ?? null,
      subtotal_clp:    subtotalNeto,
      discount_clp:    0,
      total_clp:       totalConIva,
      validity_days:   10,
      token:           crypto.randomUUID(),
      notes:           `Generada desde el simulador — escenario ${p.escenario}: ${p.escenarioLabel}`,
    })
    .select('id, quote_number')
    .single();

  if (error) return { error: error.message };
  const quoteId = quote.id as string;
  const quoteNumber = (quote as { quote_number?: string }).quote_number ?? null;

  const { error: itemsError } = await db.from('quote_items').insert(
    items.map((i) => ({
      quote_id:            quoteId,
      product_id:          null,
      description:         i.description,
      quantity:            1,
      costo_proveedor_clp: 0,
      margen_pct:          0,          // precio directo: viene del catálogo de kits
      unit_price_clp:      i.neto,
      discount_percent:    0,
      total_clp:           Math.round(i.neto * 1.19),
      sort_order:          i.sort_order,
    })),
  );
  if (itemsError) {
    // Sin ítems la cotización no sirve: se deshace para no dejar basura.
    await db.from('quotes').delete().eq('id', quoteId);
    return { error: 'No se pudieron crear los ítems: ' + itemsError.message };
  }

  // Se archiva la simulación en la instalación: en tres meses se puede ver de
  // qué números salió este precio.
  if (installationId && p.simulationData) {
    await db.from('installations').update({
      simulation_data: p.simulationData,
      updated_at:      new Date().toISOString(),
    }).eq('id', installationId);
  }

  revalidatePath('/admin/quotes');
  revalidatePath('/admin/clients');
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, quoteId, quoteNumber };
}
