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

/**
 * Palabras clave que calzan en el texto. La palabra debe aparecer al INICIO de
 * una palabra del texto: "fotovoltaic" calza con "fotovoltaicos" y "plc" con
 * "PLC Beckhoff", pero "plc" ya no calza dentro de "CAPLC" ni "HPLC".
 */
export function matchKeywords(text: string, keywords: string[]): string[] {
  const norm = normalizeText(text);
  return keywords.filter((kw) => {
    const k = normalizeText(kw).trim();
    if (!k) return false;
    for (let i = norm.indexOf(k); i !== -1; i = norm.indexOf(k, i + 1)) {
      if (i === 0 || !/[a-z0-9ñ]/.test(norm[i - 1])) return true;
    }
    return false;
  });
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

// Títulos genéricos que pueden esconder un proyecto solar en la descripción
// ("Mejoramiento sede vecinal", "Proyecto eléctrico edificio X"). Si el título
// no calza con ninguna búsqueda pero contiene alguno de estos términos, se trae
// el detalle y se buscan las palabras clave también en la descripción.
const TERMINOS_DUDOSOS = [
  'energia', 'energetic', 'electric', 'luminaria', 'alumbrado', 'iluminacion',
  'bateria', 'inversor', 'generador', 'sustentab', 'agua caliente', 'termo',
];
// Tope de detalles extra por corrida, para no acercarse al límite del ticket
// ni al tiempo máximo de la función.
const MAX_DUDOSAS = 60;

type SearchConfig = {
  id: string;
  nombre: string;
  lastEmailDate: string | null;
  keywords: string[];
  recipients: string[];
};

export interface SearchSyncResult {
  nombre: string;
  calzaron: number;
  nuevas: number;
  emailEnviado: boolean;
}

export interface SyncResult {
  revisadas: number;   // licitaciones publicadas revisadas
  calzaron: number;    // calzaron con alguna búsqueda
  nuevas: number;      // insertadas en la BD
  dudosas: number;     // títulos genéricos revisados por descripción
  emailEnviado: boolean;
  busquedas: SearchSyncResult[];
  error?: string;
}

/** Día de hoy en Chile, 'YYYY-MM-DD'. */
function hoyChile(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

/** Búsquedas activas con sus palabras clave y correos activos. */
async function loadSearches(): Promise<{ searches: SearchConfig[]; error: boolean }> {
  const db = getSupabaseAdmin();
  const [s, k, r] = await Promise.all([
    db.from('tender_searches').select('id, nombre, last_email_date').eq('is_active', true).order('created_at'),
    db.from('tender_keywords').select('search_id, keyword').eq('is_active', true),
    db.from('tender_recipients').select('search_id, email').eq('is_active', true),
  ]);
  if (s.error || k.error || r.error) return { searches: [], error: true };
  type Row = { search_id: string };
  const searches = (s.data ?? []).map((row: { id: string; nombre: string; last_email_date: string | null }) => ({
    id: row.id,
    nombre: row.nombre,
    lastEmailDate: row.last_email_date,
    keywords: ((k.data ?? []) as Array<Row & { keyword: string }>).filter((x) => x.search_id === row.id).map((x) => x.keyword),
    recipients: ((r.data ?? []) as Array<Row & { email: string }>).filter((x) => x.search_id === row.id).map((x) => x.email),
  }));
  return { searches, error: false };
}

/** Búsquedas con las que calza un texto, y las palabras que calzaron. */
function matchSearches(text: string, searches: SearchConfig[]) {
  const ids: string[] = [];
  const words = new Set<string>();
  for (const s of searches) {
    const m = matchKeywords(text, s.keywords);
    if (m.length > 0) {
      ids.push(s.id);
      m.forEach((w) => words.add(w));
    }
  }
  return { ids, words: [...words] };
}

/**
 * Sincroniza licitaciones de hoy y ayer (para cubrir desfases horarios):
 * lista → calza títulos contra cada búsqueda → para títulos genéricos revisa
 * también la descripción → inserta en `tenders` → cada búsqueda envía su correo.
 *
 * Corre dos veces al día (cron de Vercel + respaldo de GitHub Actions). Las
 * licitaciones no se repiten (dedup por código) y el aviso de "sin novedades"
 * sale una sola vez al día por búsqueda (`last_email_date`).
 */
export async function syncTenders(): Promise<SyncResult> {
  const db = getSupabaseAdmin();
  const hoy = hoyChile();

  const { searches, error: loadError } = await loadSearches();
  const conPalabras = searches.filter((s) => s.keywords.length > 0);
  if (conPalabras.length === 0) {
    // Sin búsquedas o sin palabras: igual se envía el aviso diario para no
    // romper el heartbeat, marcando la anomalía.
    const warning = loadError
      ? 'No se pudieron cargar las búsquedas: error al consultar la base de datos. Revisa la conexión a Supabase.'
      : 'No hay búsquedas con palabras clave activas. Configúralas en /admin/licitaciones.';
    const busquedas = await sendHeartbeats(searches, hoy, 0, {}, warning);
    return { revisadas: 0, calzaron: 0, nuevas: 0, dudosas: 0, emailEnviado: busquedas.some((b) => b.emailEnviado), busquedas, error: warning };
  }

  // Hoy y ayer en hora de Chile: una sincronización manual de noche no debe
  // pedir el día siguiente porque el servidor está en UTC.
  const [y, m, d] = hoy.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const yesterday = new Date(y, m - 1, d - 1);

  const seen = new Map<string, MPListItem>();
  let fetchOk = false; // ¿respondió la API de Mercado Público al menos una vez?
  for (const date of [today, yesterday]) {
    try {
      const list = await fetchTendersByDate(date);
      fetchOk = true;
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

  // Las que ya están en la BD no se vuelven a revisar.
  const existing = new Set<string>();
  const openCodes = open.map((o) => o.CodigoExterno);
  for (let i = 0; i < openCodes.length; i += 300) {
    const { data } = await db.from('tenders').select('codigo_externo').in('codigo_externo', openCodes.slice(i, i + 300));
    (data ?? []).forEach((r: { codigo_externo: string }) => existing.add(r.codigo_externo));
  }

  const porTitulo = open.filter((item) => matchSearches(item.Nombre, conPalabras).ids.length > 0);
  const dudosas = open
    .filter((item) => !existing.has(item.CodigoExterno))
    .filter((item) => matchSearches(item.Nombre, conPalabras).ids.length === 0)
    .filter((item) => matchKeywords(item.Nombre, TERMINOS_DUDOSOS).length > 0)
    .slice(0, MAX_DUDOSAS);

  // Cuántas calzan por título en cada búsqueda (incluidas las ya registradas).
  const calzaronPorBusqueda: Record<string, number> = {};
  porTitulo.forEach((item) => matchSearches(item.Nombre, conPalabras).ids.forEach((id) => {
    calzaronPorBusqueda[id] = (calzaronPorBusqueda[id] ?? 0) + 1;
  }));

  const candidatas = [
    ...porTitulo.filter((p) => !existing.has(p.CodigoExterno)),
    ...dudosas,
  ];

  // Detalle + insert (secuencial por rate limit)
  const inserted: Tender[] = [];
  for (const item of candidatas) {
    try {
      await sleep(1200);
      const detail = await fetchTenderDetail(item.CodigoExterno);
      const fullText = `${detail?.Nombre ?? item.Nombre} ${detail?.Descripcion ?? ''}`;
      const match = matchSearches(fullText, conPalabras);
      if (match.ids.length === 0) continue; // dudosa que tampoco calzó por descripción
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
        keywords_matched:  match.words,
        searches_matched:  match.ids,
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

  // ── Un correo por búsqueda ─────────────────────────────────────────────────
  // Con licitaciones nuevas: siempre se envía. Sin nuevas: aviso de "sin
  // novedades" (heartbeat), pero solo si esa búsqueda no envió nada hoy.
  const warning = !fetchOk
    ? 'No se pudo consultar la API de Mercado Público hoy (posible caída temporal del servicio). Se reintentará en la próxima corrida.'
    : undefined;

  const busquedas: SearchSyncResult[] = [];
  const sinNuevas: SearchConfig[] = [];
  for (const s of searches) {
    const suyas = inserted.filter((t) => t.searches_matched.includes(s.id));
    if (suyas.length === 0) { sinNuevas.push(s); continue; }
    const ok = await notifyNewTenders(s, suyas);
    if (ok) {
      await db.from('tenders').update({ notificada: true }).in('codigo_externo', suyas.map((t) => t.codigo_externo));
      await db.from('tender_searches').update({ last_email_date: hoy }).eq('id', s.id);
    }
    busquedas.push({ nombre: s.nombre, calzaron: Math.max(calzaronPorBusqueda[s.id] ?? 0, suyas.length), nuevas: suyas.length, emailEnviado: ok });
  }
  busquedas.push(...await sendHeartbeats(sinNuevas, hoy, all.length, calzaronPorBusqueda, warning));

  const calzaronCodigos = new Set([...porTitulo.map((p) => p.CodigoExterno), ...inserted.map((t) => t.codigo_externo)]);
  return {
    revisadas: all.length,
    calzaron: calzaronCodigos.size,
    nuevas: inserted.length,
    dudosas: dudosas.length,
    emailEnviado: busquedas.some((b) => b.emailEnviado),
    busquedas,
  };
}

/** Aviso de "sin novedades" a las búsquedas que aún no enviaron correo hoy. */
async function sendHeartbeats(
  searches: SearchConfig[],
  hoy: string,
  revisadas: number,
  calzaronPorBusqueda: Record<string, number>,
  warning?: string,
): Promise<SearchSyncResult[]> {
  const db = getSupabaseAdmin();
  const out: SearchSyncResult[] = [];
  for (const s of searches) {
    const calzaron = calzaronPorBusqueda[s.id] ?? 0;
    if (s.lastEmailDate === hoy) {
      out.push({ nombre: s.nombre, calzaron, nuevas: 0, emailEnviado: false });
      continue;
    }
    const ok = await notifyNoNewTenders(s, { revisadas, calzaron }, warning);
    if (ok) await db.from('tender_searches').update({ last_email_date: hoy }).eq('id', s.id);
    out.push({ nombre: s.nombre, calzaron, nuevas: 0, emailEnviado: ok });
  }
  return out;
}

// ─── Email de notificación (Resend) ──────────────────────────────────────────
// Cada búsqueda envía a sus propios correos (tender_recipients.search_id). Una
// búsqueda sin correos activos no envía nada: sus licitaciones solo se ven en
// el backoffice.

function emailShell(etiqueta: string, titulo: string, cuerpo: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:#010101;padding:22px 28px">
          <p style="margin:0;color:#70caca;font-size:11px;letter-spacing:1px;text-transform:uppercase">Mercado Energy · Licitaciones · ${etiqueta}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:20px">${titulo}</h1>
        </td></tr>
        ${cuerpo}
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || to.length === 0) return false;
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: 'Mercado Energy <notificaciones@send.mercadoenergy.cl>',
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[mercadopublico] Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[mercadopublico] Resend error:', err);
    return false;
  }
}

async function notifyNewTenders(search: Pick<SearchConfig, 'nombre' | 'recipients'>, tenders: Tender[]): Promise<boolean> {
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

  const n = tenders.length;
  const titulo = `${n} licitaci${n === 1 ? 'ón nueva' : 'ones nuevas'} en Mercado Público`;
  const html = emailShell(search.nombre, titulo, `
        <tr><td style="padding:8px 16px 20px">
          <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>
          <p style="margin:16px 12px 0;font-size:12px">
            <a href="https://www.mercadoenergy.cl/admin/licitaciones" style="color:#1d65c5">Ver todas en el backoffice →</a>
          </p>
        </td></tr>`);

  return sendEmail(search.recipients, `[${search.nombre}] ${titulo}`, html);
}

// Correo "heartbeat" de los días SIN licitaciones nuevas: confirma que la
// revisión corrió. `warning` (opcional): anomalía detectada (API caída, sin
// palabras clave) que se muestra destacada.
async function notifyNoNewTenders(
  search: Pick<SearchConfig, 'nombre' | 'recipients'>,
  stats: { revisadas: number; calzaron: number },
  warning?: string,
): Promise<boolean> {
  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  const warningBlock = warning ? `
          <p style="margin:0 0 16px;padding:10px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e">
            ⚠ ${warning}
          </p>` : '';

  const html = emailShell(search.nombre, 'Sin licitaciones nuevas hoy', `
        <tr><td style="padding:22px 28px">
          ${warningBlock}
          <p style="margin:0 0 12px;font-size:14px;color:#374151">
            Revisión del <strong>${fecha}</strong> completada. No apareció ninguna licitación nueva para la búsqueda <strong>${search.nombre}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:13px;color:#6b7280">
            Se revisaron <strong>${stats.revisadas}</strong> publicaciones de hoy y ayer en Mercado Público${stats.calzaron > 0 ? ` (${stats.calzaron} ya estaban registradas)` : ''}.
          </p>
          <p style="margin:0;font-size:12px;color:#9ca3af">
            Este aviso confirma que la sincronización diaria está funcionando. Llega una vez al día por búsqueda.
          </p>
          <p style="margin:16px 0 0;font-size:12px">
            <a href="https://www.mercadoenergy.cl/admin/licitaciones" style="color:#1d65c5">Ver todas en el backoffice →</a>
          </p>
        </td></tr>`);

  return sendEmail(search.recipients, `[${search.nombre}] Sin licitaciones nuevas hoy — Mercado Público`, html);
}

// Correo de PRUEBA por búsqueda con sus últimas licitaciones guardadas, por el
// mismo camino real de notificación. No toca `last_email_date`.
export async function sendTestTenderNotification(): Promise<{ ok: boolean; sent: number; reason?: string }> {
  const db = getSupabaseAdmin();
  const { searches } = await loadSearches();
  let sent = 0;
  for (const s of searches) {
    const { data } = await db
      .from('tenders')
      .select('*')
      .contains('searches_matched', [s.id])
      .order('created_at', { ascending: false })
      .limit(3);
    const tenders = (data ?? []) as Tender[];
    if (tenders.length && await notifyNewTenders(s, tenders)) sent += tenders.length;
  }
  return sent > 0
    ? { ok: true, sent }
    : { ok: false, sent: 0, reason: 'No se envió nada — revisa RESEND_API_KEY, los correos de cada búsqueda o que haya licitaciones guardadas.' };
}

// Correo de PRUEBA del heartbeat "sin novedades", a cada búsqueda activa.
export async function sendTestNoNewTenders(): Promise<{ ok: boolean; reason?: string }> {
  const { searches } = await loadSearches();
  let ok = false;
  for (const s of searches) ok = (await notifyNoNewTenders(s, { revisadas: 0, calzaron: 0 })) || ok;
  return {
    ok,
    reason: ok ? undefined : 'Resend no envió — revisa RESEND_API_KEY o los correos de cada búsqueda en /admin/licitaciones.',
  };
}
