import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSalesInvoicesWithPago, hoyChile, type SalesInvoiceWithPago } from '@/lib/db/sales';
import { EMAIL, emailHeader, emailFooter, emailShell } from '@/lib/email-brand';
import { SITE_URL } from '@/lib/seo';

// ─── Cobranza automática de facturas de venta ────────────────────────────────
//
// Cadencia acordada: aviso preventivo 3 días antes del compromiso, aviso el día
// del vencimiento y luego recordatorio cada 7 días mientras quede saldo.
//
// El escalón alcanzado se guarda en la factura (cobranza_nivel + fecha del
// último envío) en vez de depender de que el cron corra TODOS los días: si un
// día no se dispara — el cron de Vercel en plan Hobby es "best effort" y ya
// falló una vez — el aviso sale igual al día siguiente, no se pierde.

export type CobranzaNivel = 'previo' | 'vencimiento' | 'atraso';

const DIAS_AVISO_PREVIO = 3;
const DIAS_ENTRE_RECORDATORIOS = 7;

const FROM = 'Mercado Energy <notificaciones@send.mercadoenergy.cl>';

const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const fechaLarga = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
};

// ─── Qué avisar hoy ──────────────────────────────────────────────────────────

// Escalón que le corresponde HOY a una factura según su atraso.
function nivelObjetivo(diasVencido: number): CobranzaNivel | null {
  if (diasVencido >= 1) return 'atraso';
  if (diasVencido === 0) return 'vencimiento';
  if (diasVencido >= -DIAS_AVISO_PREVIO) return 'previo';
  return null;
}

// Días transcurridos desde el último envío, contados en DÍAS DE CALENDARIO.
// El último envío se guarda como marca de tiempo UTC y `hoy` es la fecha en
// Chile: comparar ambos en crudo restaría las horas del día y un recordatorio
// "a los 7 días" recién saldría al octavo.
const diasDesde = (iso: string | null, hoy: string): number => {
  if (!iso) return 9999;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 9999;
  const enviado = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  const a = Date.parse(`${enviado}T00:00:00Z`);
  const b = Date.parse(`${hoy}T00:00:00Z`);
  if (isNaN(a) || isNaN(b)) return 9999;
  return Math.round((b - a) / 86400000);
};

// ¿Toca enviar aviso de esta factura hoy?
export function debeAvisar(inv: SalesInvoiceWithPago, hoy: string): CobranzaNivel | null {
  if (inv.estado === 'anulada') return null;
  if (inv.cobranza_pausada) return null;
  if (inv.saldo <= 1) return null;                  // ya está pagada
  if (!inv.fecha_compromiso) return null;           // sin compromiso no hay plazo

  const objetivo = nivelObjetivo(inv.diasVencido);
  if (!objetivo) return null;

  const ultimo = inv.cobranza_nivel as CobranzaNivel | null;

  // El preventivo y el del día del vencimiento se mandan una sola vez cada uno.
  if (objetivo === 'previo') return ultimo === 'previo' ? null : 'previo';
  if (objetivo === 'vencimiento') {
    return ultimo === 'vencimiento' || ultimo === 'atraso' ? null : 'vencimiento';
  }
  // En atraso: se repite cada 7 días desde el último envío, sea cual sea.
  if (ultimo !== 'atraso') return 'atraso';
  return diasDesde(inv.cobranza_ultimo_envio, hoy) >= DIAS_ENTRE_RECORDATORIOS ? 'atraso' : null;
}

export type CobranzaItem = { inv: SalesInvoiceWithPago; nivel: CobranzaNivel };

export async function getAvisosDeHoy(hoy = hoyChile()): Promise<CobranzaItem[]> {
  const facturas = await getSalesInvoicesWithPago();
  const items: CobranzaItem[] = [];
  for (const inv of facturas) {
    const nivel = debeAvisar(inv, hoy);
    if (nivel) items.push({ inv, nivel });
  }
  // Lo más atrasado primero.
  return items.sort((a, b) => b.inv.diasVencido - a.inv.diasVencido);
}

// Todo lo que está por cobrar (para la vista Cobranza del back-office).
export function resumenCartera(facturas: SalesInvoiceWithPago[]) {
  const abiertas = facturas.filter((f) => f.estado === 'emitida' && f.saldo > 1);
  const vencidas = abiertas.filter((f) => f.estadoPago === 'vencida');
  return {
    porCobrar:      abiertas.reduce((s, f) => s + f.saldo, 0),
    vencido:        vencidas.reduce((s, f) => s + f.saldo, 0),
    docsAbiertos:   abiertas.length,
    docsVencidos:   vencidas.length,
    masAtrasada:    vencidas.length ? Math.max(...vencidas.map((f) => f.diasVencido)) : 0,
  };
}

// ─── Correo ──────────────────────────────────────────────────────────────────

async function getCobranzaConfig(): Promise<{ email: string; activa: boolean }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('config_parameters').select('key, value')
    .in('key', ['cobranza.email', 'cobranza.activa']);
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as Array<{ key: string; value: string }>) map[r.key] = String(r.value ?? '');
  return {
    email: map['cobranza.email'] || process.env.LEAD_RECIPIENT_EMAIL || 'ventas@mercadoenergy.cl',
    activa: (map['cobranza.activa'] ?? 'true') !== 'false',
  };
}

const NIVEL_BADGE: Record<CobranzaNivel, { texto: string; bg: string; color: string }> = {
  previo:      { texto: 'Por vencer',  bg: '#eaf4fb', color: '#1d65c5' },
  vencimiento: { texto: 'Vence hoy',   bg: '#fef3c7', color: '#92400e' },
  atraso:      { texto: 'Vencida',     bg: '#fee2e2', color: '#991b1b' },
};

function filaFactura({ inv, nivel }: CobranzaItem): string {
  const badge = NIVEL_BADGE[nivel];
  const atraso = nivel === 'atraso'
    ? `<span style="color:#991b1b;font-weight:600">${inv.diasVencido} ${inv.diasVencido === 1 ? 'día' : 'días'} de atraso</span>`
    : nivel === 'vencimiento'
      ? '<span style="color:#92400e;font-weight:600">vence hoy</span>'
      : `vence en ${Math.abs(inv.diasVencido)} ${Math.abs(inv.diasVencido) === 1 ? 'día' : 'días'}`;

  const parcial = inv.pagado > 0
    ? `<p style="margin:6px 0 0;font-size:12px;color:${EMAIL.gray}">
         Abonado ${clp(inv.pagado)} de ${clp(inv.total_clp)} (${inv.pctPagado}%)
       </p>`
    : '';

  return `
    <tr><td style="padding:14px 0;border-bottom:1px solid ${EMAIL.border}">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top">
          <p style="margin:0;font-size:15px;font-weight:600;color:${EMAIL.dark}">
            ${inv.client_nombre ?? 'Cliente sin nombre'}
          </p>
          <p style="margin:3px 0 0;font-size:12px;color:${EMAIL.gray}">
            Factura ${inv.folio ?? 's/folio'} · ${fechaLarga(inv.fecha_compromiso)} · ${atraso}
          </p>
          ${inv.project_name ? `<p style="margin:3px 0 0;font-size:12px;color:${EMAIL.gray}">${inv.project_name}</p>` : ''}
          ${parcial}
        </td>
        <td align="right" style="vertical-align:top;white-space:nowrap;padding-left:12px">
          <p style="margin:0;font-size:17px;font-weight:700;color:${EMAIL.brand}">${clp(inv.saldo)}</p>
          <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:99px;background:${badge.bg};color:${badge.color};font-size:11px;font-weight:600">
            ${badge.texto}
          </span>
        </td>
      </tr></table>
    </td></tr>`;
}

export function buildCobranzaEmailHtml(items: CobranzaItem[], hoy: string): string {
  const total = items.reduce((s, i) => s + i.inv.saldo, 0);
  const vencidas = items.filter((i) => i.nivel === 'atraso');
  const totalVencido = vencidas.reduce((s, i) => s + i.inv.saldo, 0);

  const subtitulo = vencidas.length
    ? `${vencidas.length} ${vencidas.length === 1 ? 'factura vencida' : 'facturas vencidas'} por ${clp(totalVencido)}`
    : 'Ninguna vencida todavía';

  return emailShell(`
${emailHeader({
  eyebrow: fechaLarga(hoy),
  title: `${items.length} ${items.length === 1 ? 'factura requiere' : 'facturas requieren'} seguimiento`,
  subtitle: subtitulo,
})}

        <tr><td style="padding:26px 32px 8px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL.accentSoft};border:1px solid ${EMAIL.accentBdr};border-radius:10px">
            <tr><td style="padding:16px 20px">
              <p style="margin:0;font-size:12px;color:${EMAIL.gray};text-transform:uppercase;letter-spacing:.05em">Total por cobrar en estos documentos</p>
              <p style="margin:4px 0 0;font-size:26px;font-weight:700;color:${EMAIL.brand}">${clp(total)}</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:10px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${items.map(filaFactura).join('')}
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 30px">
          <a href="${SITE_URL}/admin/facturas?tab=cobranza"
             style="display:inline-block;background:${EMAIL.brand};color:${EMAIL.white};text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600">
            Ver la cartera completa
          </a>
        </td></tr>

${emailFooter(`Aviso automático de cobranza · Mercado Energy<br>
Se envía 3 días antes del compromiso de pago, el día del vencimiento y cada ${DIAS_ENTRE_RECORDATORIOS} días mientras quede saldo.<br>
Puedes pausar el aviso de una factura puntual desde el back-office.`)}
  `);
}

// ─── Envío + marca de estado ─────────────────────────────────────────────────

export type CobranzaRunResult = {
  ok: boolean;
  fecha: string;
  revisadas: number;
  avisadas: number;
  emailEnviado: boolean;
  destinatario?: string;
  motivo?: string;
};

export async function runCobranza(opts?: { dryRun?: boolean }): Promise<CobranzaRunResult> {
  const hoy = hoyChile();
  const config = await getCobranzaConfig();
  const items = await getAvisosDeHoy(hoy);

  if (!config.activa) {
    return { ok: true, fecha: hoy, revisadas: items.length, avisadas: 0, emailEnviado: false, motivo: 'Cobranza desactivada en Configuración' };
  }
  if (items.length === 0) {
    // Sin novedades no se envía correo: a diferencia de las licitaciones, aquí
    // el silencio no es ambiguo (la cartera se ve completa en el back-office).
    return { ok: true, fecha: hoy, revisadas: 0, avisadas: 0, emailEnviado: false, motivo: 'Ninguna factura requiere aviso hoy' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, fecha: hoy, revisadas: items.length, avisadas: 0, emailEnviado: false, motivo: 'Falta RESEND_API_KEY' };
  }

  if (opts?.dryRun) {
    return { ok: true, fecha: hoy, revisadas: items.length, avisadas: 0, emailEnviado: false, destinatario: config.email, motivo: 'Simulación: no se envió ni se marcó nada' };
  }

  const vencidas = items.filter((i) => i.nivel === 'atraso').length;
  const asunto = vencidas > 0
    ? `Cobranza: ${vencidas} ${vencidas === 1 ? 'factura vencida' : 'facturas vencidas'} · ${items.length} por seguir`
    : `Cobranza: ${items.length} ${items.length === 1 ? 'factura por vencer' : 'facturas por vencer'}`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: config.email,
      subject: asunto,
      html: buildCobranzaEmailHtml(items, hoy),
    });
    if (error) {
      return { ok: false, fecha: hoy, revisadas: items.length, avisadas: 0, emailEnviado: false, destinatario: config.email, motivo: error.message };
    }
  } catch (e) {
    return { ok: false, fecha: hoy, revisadas: items.length, avisadas: 0, emailEnviado: false, destinatario: config.email, motivo: e instanceof Error ? e.message : 'Error al enviar' };
  }

  // El escalón solo se marca DESPUÉS de que el correo salió: si el envío falla,
  // la factura queda pendiente y se reintenta en la corrida siguiente.
  const db = getSupabaseAdmin();
  const ahora = new Date().toISOString();
  await Promise.all(items.map(({ inv, nivel }) =>
    db.from('sales_invoices')
      .update({ cobranza_nivel: nivel, cobranza_ultimo_envio: ahora })
      .eq('id', inv.id),
  ));

  return { ok: true, fecha: hoy, revisadas: items.length, avisadas: items.length, emailEnviado: true, destinatario: config.email };
}
