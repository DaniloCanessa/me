import { getSupabaseAdmin } from '@/lib/supabase';
import type { Tender } from '@/lib/types';

// ─── API de Mercado Público (ChileCompra) ─────────────────────────────────────
// Docs: https://api.mercadopublico.cl — autenticación por ticket gratuito.
// La API no soporta búsqueda por palabra clave: se listan las licitaciones
// publicadas por día y se filtran localmente contra tender_keywords.

const API_BASE = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';

// Ticket público de prueba documentado por ChileCompra — para desarrollo.
// En producción definir MERCADO_PUBLICO_TICKET (solicitado en api.mercadopublico.cl).
const TEST_TICKET = 'F8537A18-6766-4DEF-9E59-426B4FEE2844';

function getTicket(): string {
  return process.env.MERCADO_PUBLICO_TICKET ?? TEST_TICKET;
}

/** Normaliza para matching: minúsculas y sin acentos. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Palabras clave activas que calzan dentro del texto dado. */
export function matchKeywords(text: string, keywords: string[]): string[] {
  const norm = normalizeText(text);
  return keywords.filter((kw) => norm.includes(normalizeText(kw)));
}

// ─── Tipos de la API ──────────────────────────────────────────────────────────

interface MPListItem {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  FechaCierre: string | null;
}

interface MPDetail {
  CodigoExterno: string;
  Nombre: string;
  Descripcion?: string | null;
  Estado?: string | null;
  CodigoEstado?: number;
  MontoEstimado?: number | null;
  Moneda?: string | null;
  Comprador?: {
    NombreOrganismo?: string | null;
    NombreUnidad?: string | null;
    RegionUnidad?: string | null;
  };
  Fechas?: {
    FechaPublicacion?: string | null;
    FechaCierre?: string | null;
  };
}

interface MPResponse<T> {
  Cantidad?: number;
  Listado?: T[];
  Codigo?: number;   // presente en respuestas de error
  Mensaje?: string;
}

// ─── Fetch con reintento (la API es ocasionalmente inestable) ────────────────

async function mpFetch<T>(params: string): Promise<MPResponse<T>> {
  const url = `${API_BASE}?${params}&ticket=${getTicket()}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MPResponse<T>;
      if (json.Codigo != null && json.Mensaje) throw new Error(`API ${json.Codigo}: ${json.Mensaje}`);
      return json;
    } catch (err) {
      if (attempt === 1) throw err;
      await sleep(1500);
    }
  }
  throw new Error('unreachable');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toDdmmyyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${d.getFullYear()}`;
}

/** Listado de licitaciones publicadas en una fecha. */
export async function fetchTendersByDate(date: Date): Promise<MPListItem[]> {
  const json = await mpFetch<MPListItem>(`fecha=${toDdmmyyyy(date)}`);
  return json.Listado ?? [];
}

/** Detalle completo de una licitación por código. */
export async function fetchTenderDetail(codigo: string): Promise<MPDetail | null> {
  const json = await mpFetch<MPDetail>(`codigo=${encodeURIComponent(codigo)}`);
  return json.Listado?.[0] ?? null;
}

/** Link público a la ficha de la licitación. */
export function tenderUrl(codigoExterno: string): string {
  return `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(codigoExterno)}`;
}

// ─── Sincronización ───────────────────────────────────────────────────────────

export interface SyncResult {
  revisadas: number;   // licitaciones publicadas revisadas
  calzaron: number;    // calzaron con alguna palabra clave
  nuevas: number;      // insertadas en la BD
  emailEnviado: boolean;
  error?: string;
}

/**
 * Sincroniza licitaciones de hoy y ayer (para cubrir desfases horarios):
 * lista → filtra por keywords sobre el nombre → trae detalle de las nuevas →
 * inserta en `tenders` → notifica por email si hay nuevas.
 */
export async function syncTenders(): Promise<SyncResult> {
  const db = getSupabaseAdmin();

  const { data: kwRows } = await db
    .from('tender_keywords')
    .select('keyword')
    .eq('is_active', true);
  const keywords = (kwRows ?? []).map((k: { keyword: string }) => k.keyword);
  if (keywords.length === 0) {
    return { revisadas: 0, calzaron: 0, nuevas: 0, emailEnviado: false, error: 'No hay palabras clave activas' };
  }

  // Hoy y ayer
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const seen = new Map<string, MPListItem>();
  for (const date of [today, yesterday]) {
    try {
      const list = await fetchTendersByDate(date);
      list.forEach((item) => { if (!seen.has(item.CodigoExterno)) seen.set(item.CodigoExterno, item); });
    } catch (err) {
      console.error('[mercadopublico] Error listando fecha', toDdmmyyyy(date), err);
    }
    await sleep(1200); // rate limit ~1 req/s
  }

  const all = Array.from(seen.values());
  // Solo licitaciones aún abiertas: con fecha de cierre futura (la API también
  // lista publicaciones de licitaciones ya cerradas/adjudicadas).
  const open = all.filter((item) => !item.FechaCierre || new Date(item.FechaCierre).getTime() > Date.now());
  const matches = open.filter((item) => matchKeywords(item.Nombre, keywords).length > 0);

  // Filtrar las que ya están en la BD
  const codes = matches.map((m) => m.CodigoExterno);
  const existing = new Set<string>();
  if (codes.length > 0) {
    const { data } = await db.from('tenders').select('codigo_externo').in('codigo_externo', codes);
    (data ?? []).forEach((r: { codigo_externo: string }) => existing.add(r.codigo_externo));
  }
  const fresh = matches.filter((m) => !existing.has(m.CodigoExterno));

  // Detalle + insert (secuencial por rate limit)
  const inserted: Tender[] = [];
  for (const item of fresh) {
    try {
      await sleep(1200);
      const detail = await fetchTenderDetail(item.CodigoExterno);
      const fullText = `${detail?.Nombre ?? item.Nombre} ${detail?.Descripcion ?? ''}`;
      const matched = matchKeywords(fullText, keywords);
      const row = {
        codigo_externo:    item.CodigoExterno,
        nombre:            detail?.Nombre ?? item.Nombre,
        descripcion:       detail?.Descripcion ?? null,
        organismo:         detail?.Comprador?.NombreOrganismo ?? null,
        unidad:            detail?.Comprador?.NombreUnidad ?? null,
        region:            detail?.Comprador?.RegionUnidad ?? null,
        fecha_publicacion: detail?.Fechas?.FechaPublicacion?.slice(0, 10) ?? null,
        fecha_cierre:      detail?.Fechas?.FechaCierre ?? item.FechaCierre,
        estado_mp:         detail?.Estado != null ? String(detail.Estado) : 'Publicada',
        monto_estimado:    detail?.MontoEstimado ?? null,
        moneda:            detail?.Moneda ?? null,
        keywords_matched:  matched.length > 0 ? matched : matchKeywords(item.Nombre, keywords),
        estado_interno:    'nueva',
        notificada:        false,
      };
      const { error } = await db.from('tenders').insert(row);
      if (!error) inserted.push(row as unknown as Tender);
      else console.error('[mercadopublico] Insert error', item.CodigoExterno, error.message);
    } catch (err) {
      console.error('[mercadopublico] Error detalle', item.CodigoExterno, err);
    }
  }

  // Notificación por email
  let emailEnviado = false;
  if (inserted.length > 0) {
    emailEnviado = await notifyNewTenders(inserted);
    if (emailEnviado) {
      await db
        .from('tenders')
        .update({ notificada: true })
        .in('codigo_externo', inserted.map((t) => t.codigo_externo));
    }
  }

  return { revisadas: all.length, calzaron: matches.length, nuevas: inserted.length, emailEnviado };
}

// ─── Email de notificación (Resend) ──────────────────────────────────────────

async function notifyNewTenders(tenders: Tender[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.LEAD_RECIPIENT_EMAIL;
  if (!apiKey || !recipient) return false;

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const rows = tenders.map((t) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
        <a href="${tenderUrl(t.codigo_externo)}" style="color:#1d65c5;font-weight:600;text-decoration:none">${t.nombre}</a>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${t.organismo ?? '—'} · ${t.codigo_externo}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">
          Cierre: ${t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleDateString('es-CL') : '—'}
          · Calza con: ${t.keywords_matched.join(', ')}
        </div>
      </td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:#010101;padding:22px 28px">
          <p style="margin:0;color:#70caca;font-size:11px;letter-spacing:1px;text-transform:uppercase">Mercado Energy · Licitaciones</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:20px">${tenders.length} licitaci${tenders.length === 1 ? 'ón nueva' : 'ones nuevas'} en Mercado Público</h1>
        </td></tr>
        <tr><td style="padding:8px 16px 20px">
          <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>
          <p style="margin:16px 12px 0;font-size:12px">
            <a href="https://mercado-energy.vercel.app/admin/licitaciones" style="color:#1d65c5">Ver todas en el backoffice →</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    await resend.emails.send({
      from: 'Mercado Energy <onboarding@resend.dev>',
      to: [recipient],
      subject: `${tenders.length} licitaci${tenders.length === 1 ? 'ón nueva' : 'ones nuevas'} — Mercado Público`,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mercadopublico] Resend error:', err);
    return false;
  }
}
