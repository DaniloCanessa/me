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

  const { data: kwRows, error: kwError } = await db
    .from('tender_keywords')
    .select('keyword')
    .eq('is_active', true);
  const keywords = (kwRows ?? []).map((k: { keyword: string }) => k.keyword);
  if (keywords.length === 0) {
    // No se pudieron cargar las palabras clave (error de BD o tabla vacía). Aun
    // así enviamos el correo diario para no romper el heartbeat, marcando la
    // anomalía: la ausencia de correo debe significar "el cron no corrió", no
    // "el cron corrió pero falló en silencio".
    const warning = kwError
      ? 'No se pudieron cargar las palabras clave: error al consultar la base de datos. Revisa la conexión a Supabase.'
      : 'No hay palabras clave activas configuradas. Agrega alguna en /admin/licitaciones.';
    const emailEnviado = await notifyNoNewTenders({ revisadas: 0, calzaron: 0 }, warning);
    return { revisadas: 0, calzaron: 0, nuevas: 0, emailEnviado, error: warning };
  }

  // Hoy y ayer
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

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

  // Notificación por email — SIEMPRE se envía un correo diario:
  // - si hay licitaciones nuevas, llega el detalle de las nuevas;
  // - si no hay, llega un aviso de "sin novedades" que confirma que el cron
  //   corrió (heartbeat: así el usuario sabe que el sistema sigue vivo).
  let emailEnviado = false;
  if (inserted.length > 0) {
    emailEnviado = await notifyNewTenders(inserted);
    if (emailEnviado) {
      await db
        .from('tenders')
        .update({ notificada: true })
        .in('codigo_externo', inserted.map((t) => t.codigo_externo));
    }
  } else {
    // Si la API de Mercado Público no respondió en ninguna fecha, "0 publicaciones"
    // no significa "no hubo nuevas" sino "no se pudo consultar": lo advertimos.
    const warning = !fetchOk
      ? 'No se pudo consultar la API de Mercado Público hoy (posible caída temporal del servicio). Se reintentará en la próxima corrida.'
      : undefined;
    emailEnviado = await notifyNoNewTenders({ revisadas: all.length, calzaron: matches.length }, warning);
  }

  return { revisadas: all.length, calzaron: matches.length, nuevas: inserted.length, emailEnviado };
}

// ─── Email de notificación (Resend) ──────────────────────────────────────────

// Destinatarios parametrizables (tabla tender_recipients, editable en
// /admin/licitaciones). Fallback a LEAD_RECIPIENT_EMAIL si no hay activos.
async function getActiveRecipients(): Promise<string[]> {
  const db = getSupabaseAdmin();
  const { data: recRows } = await db
    .from('tender_recipients')
    .select('email')
    .eq('is_active', true);
  let recipients = (recRows ?? []).map((r: { email: string }) => r.email);
  if (recipients.length === 0 && process.env.LEAD_RECIPIENT_EMAIL) {
    recipients = [process.env.LEAD_RECIPIENT_EMAIL];
  }
  return recipients;
}

async function notifyNewTenders(tenders: Tender[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const recipients = await getActiveRecipients();
  if (recipients.length === 0) return false;

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
      from: 'Mercado Energy <notificaciones@send.mercadoenergy.cl>',
      to: recipients,
      subject: `${tenders.length} licitaci${tenders.length === 1 ? 'ón nueva' : 'ones nuevas'} — Mercado Público`,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mercadopublico] Resend error:', err);
    return false;
  }
}

// Correo "heartbeat" de los días SIN licitaciones nuevas: confirma que el cron
// corrió y revisó las publicaciones del día. Así el usuario recibe un correo
// todos los días y sabe que la sincronización sigue funcionando.
// `warning` (opcional): anomalía detectada (API caída, sin keywords) que se
// muestra destacada para que el correo diario no oculte una falla parcial.
async function notifyNoNewTenders(
  stats: { revisadas: number; calzaron: number },
  warning?: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const recipients = await getActiveRecipients();
  if (recipients.length === 0) return false;

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const warningBlock = warning ? `
          <p style="margin:0 0 16px;padding:10px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e">
            ⚠ ${warning}
          </p>` : '';

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
          <h1 style="margin:8px 0 0;color:#fff;font-size:20px">Sin licitaciones nuevas hoy</h1>
        </td></tr>
        <tr><td style="padding:22px 28px">
          ${warningBlock}
          <p style="margin:0 0 12px;font-size:14px;color:#374151">
            Revisión del <strong>${fecha}</strong> completada. No apareció ninguna licitación nueva que calce con tus palabras clave.
          </p>
          <p style="margin:0 0 16px;font-size:13px;color:#6b7280">
            Se revisaron <strong>${stats.revisadas}</strong> publicaciones de hoy y ayer en Mercado Público${stats.calzaron > 0 ? ` (${stats.calzaron} ya estaban registradas)` : ''}.
          </p>
          <p style="margin:0;font-size:12px;color:#9ca3af">
            Este aviso confirma que la sincronización diaria está funcionando.
          </p>
          <p style="margin:16px 0 0;font-size:12px">
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
      from: 'Mercado Energy <notificaciones@send.mercadoenergy.cl>',
      to: recipients,
      subject: 'Sin licitaciones nuevas hoy — Mercado Público',
      html,
    });
    return true;
  } catch (err) {
    console.error('[mercadopublico] Resend error (sin novedades):', err);
    return false;
  }
}

// Envía un correo de PRUEBA con las últimas licitaciones guardadas, por el
// mismo camino real de notificación. Sirve para verificar el envío end-to-end
// sin esperar a que aparezcan nuevas. La lógica diaria NO cambia.
export async function sendTestTenderNotification(): Promise<{ ok: boolean; sent: number; reason?: string }> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('tenders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  const tenders = (data ?? []) as Tender[];
  if (tenders.length === 0) {
    return { ok: false, sent: 0, reason: 'No hay licitaciones en la base para la prueba.' };
  }
  const ok = await notifyNewTenders(tenders);
  return {
    ok,
    sent: ok ? tenders.length : 0,
    reason: ok ? undefined : 'Resend no envió — revisa RESEND_API_KEY o los destinatarios en /admin/licitaciones.',
  };
}

// Envía un correo de PRUEBA del heartbeat "sin novedades", por el mismo camino
// real. Sirve para verificar ese correo sin esperar a un día sin licitaciones.
export async function sendTestNoNewTenders(): Promise<{ ok: boolean; reason?: string }> {
  const ok = await notifyNoNewTenders({ revisadas: 0, calzaron: 0 });
  return {
    ok,
    reason: ok ? undefined : 'Resend no envió — revisa RESEND_API_KEY o los destinatarios en /admin/licitaciones.',
  };
}
