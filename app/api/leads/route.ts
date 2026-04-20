import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Tipos del payload ────────────────────────────────────────────────────────

interface LeadPayload {
  customerCategory: 'natural' | 'business';
  contact: {
    name?: string;
    companyName?: string;
    contactName?: string;
    email: string;
    phone: string;
    regionId: string;
    commune?: string;
    city?: string;
  };
  supply: {
    tarifa: string;
    distribuidora: string;
  };
  averageMonthlyKWh: number;
  simulation: {
    regionName: string;
    kitSizeKWp: number;
    kitPriceCLP: number;
    monthlyBenefitCLP: number;
    annualBenefitCLP: number;
    paybackYears: number;
    coveragePercent: number;
  };
  consumption_profile?: unknown;
  scenarios_json?: unknown;
  future_consumption?: unknown;
  supply_details?: unknown;
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

function buildEmailHtml(lead: LeadPayload): string {
  const isNatural = lead.customerCategory === 'natural';
  const displayName = isNatural ? lead.contact.name : lead.contact.companyName;
  const s = lead.simulation;

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#16a34a;padding:24px 32px">
          <p style="margin:0;color:#dcfce7;font-size:13px">Nuevo lead — Mercado Energy</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px">${displayName ?? 'Sin nombre'}</h1>
          <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px">${isNatural ? 'Persona natural' : 'Empresa'} · ${s.regionName}</p>
        </td></tr>

        <!-- Contacto -->
        <tr><td style="padding:24px 32px 0">
          <h2 style="margin:0 0 12px;font-size:14px;color:#374151;text-transform:uppercase;letter-spacing:.05em">Datos de contacto</h2>
          <table cellpadding="0" cellspacing="0" width="100%">
            ${isNatural ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px">Nombre</td><td style="padding:4px 0;color:#111827;font-size:13px">${lead.contact.name ?? '—'}</td></tr>` : ''}
            ${!isNatural ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px">Empresa</td><td style="padding:4px 0;color:#111827;font-size:13px">${lead.contact.companyName ?? '—'}</td></tr>` : ''}
            ${!isNatural ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px">Contacto</td><td style="padding:4px 0;color:#111827;font-size:13px">${lead.contact.contactName ?? '—'}</td></tr>` : ''}
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:4px 0;font-size:13px"><a href="mailto:${lead.contact.email}" style="color:#16a34a">${lead.contact.email}</a></td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Teléfono</td><td style="padding:4px 0;color:#111827;font-size:13px"><a href="tel:${lead.contact.phone}" style="color:#16a34a">${lead.contact.phone}</a></td></tr>
            ${lead.contact.city ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Ciudad</td><td style="padding:4px 0;color:#111827;font-size:13px">${lead.contact.city}${lead.contact.commune ? `, ${lead.contact.commune}` : ''}</td></tr>` : ''}
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Tarifa</td><td style="padding:4px 0;color:#111827;font-size:13px">${lead.supply.tarifa === 'unknown' ? 'No sabe (BT1 referencia)' : lead.supply.tarifa}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Distribuidora</td><td style="padding:4px 0;color:#111827;font-size:13px">${lead.supply.distribuidora}</td></tr>
          </table>
        </td></tr>

        <!-- Simulación -->
        <tr><td style="padding:24px 32px 0">
          <h2 style="margin:0 0 12px;font-size:14px;color:#374151;text-transform:uppercase;letter-spacing:.05em">Resultado de simulación</h2>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb;border-radius:8px;padding:16px">
            <tr>
              <td style="padding:6px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#9ca3af">Consumo base</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827">${lead.averageMonthlyKWh} kWh/mes</p>
              </td>
              <td style="padding:6px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#9ca3af">Kit recomendado</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827">${s.kitSizeKWp} kWp</p>
              </td>
              <td style="padding:6px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#9ca3af">Cobertura solar</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#16a34a">${pct(s.coveragePercent)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 12px;text-align:center;border-top:1px solid #e5e7eb">
                <p style="margin:0;font-size:11px;color:#9ca3af">Ahorro mensual</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#16a34a">${clp(s.monthlyBenefitCLP)}</p>
              </td>
              <td style="padding:6px 12px;text-align:center;border-top:1px solid #e5e7eb">
                <p style="margin:0;font-size:11px;color:#9ca3af">Ahorro anual</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#16a34a">${clp(s.annualBenefitCLP)}</p>
              </td>
              <td style="padding:6px 12px;text-align:center;border-top:1px solid #e5e7eb">
                <p style="margin:0;font-size:11px;color:#9ca3af">Payback estimado</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111827">${s.paybackYears % 1 === 0 ? s.paybackYears : s.paybackYears.toFixed(1)} años</p>
              </td>
            </tr>
          </table>
          <p style="margin:8px 0 0;font-size:11px;color:#9ca3af">Precio referencial del kit: ${clp(s.kitPriceCLP)}</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #f3f4f6;margin-top:24px">
          <p style="margin:0;font-size:12px;color:#9ca3af">Lead generado desde <strong>Mercado Energy</strong> — simulador solar Chile</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── Email de confirmación al lead ────────────────────────────────────────────

function buildClientEmailHtml(lead: LeadPayload): string {
  const isNatural = lead.customerCategory === 'natural';
  const displayName = isNatural
    ? lead.contact.name
    : (lead.contact.contactName ?? lead.contact.companyName);
  const s = lead.simulation;

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#16a34a;padding:24px 32px">
          <p style="margin:0;color:#dcfce7;font-size:13px">Mercado Energy — Propuesta Solar</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px">Hola, ${displayName ?? 'estimado/a cliente'}</h1>
          <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px">Gracias por tu interés en energía solar fotovoltaica</p>
        </td></tr>

        <!-- Mensaje -->
        <tr><td style="padding:24px 32px 16px">
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
            Hemos recibido tu solicitud. Un especialista técnico de <strong>Mercado Energy</strong> se pondrá en contacto contigo a la brevedad para coordinar una <strong>visita técnica gratuita</strong> y entregarte un presupuesto definitivo personalizado, sin costo ni compromiso.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
            A continuación, el resumen de tu propuesta estimada:
          </p>
        </td></tr>

        <!-- Propuesta -->
        <tr><td style="padding:0 32px 24px">
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
            <tr>
              <td style="padding:14px 12px;text-align:center;border-right:1px solid #d1fae5">
                <p style="margin:0;font-size:11px;color:#6b7280">Sistema recomendado</p>
                <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#15803d">${s.kitSizeKWp} kWp</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280">Planta Fotovoltaica</p>
              </td>
              <td style="padding:14px 12px;text-align:center;border-right:1px solid #d1fae5">
                <p style="margin:0;font-size:11px;color:#6b7280">Ahorro mensual estimado</p>
                <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#15803d">${clp(s.monthlyBenefitCLP)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280">por mes</p>
              </td>
              <td style="padding:14px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#6b7280">Período de retorno</p>
                <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#111827">${s.paybackYears % 1 === 0 ? s.paybackYears : s.paybackYears.toFixed(1)} años</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280">payback estimado</p>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:12px;border-top:1px solid #d1fae5;text-align:center">
                <p style="margin:0;font-size:13px;color:#374151">
                  Cobertura solar: <strong style="color:#15803d">${pct(s.coveragePercent)}</strong> de tu consumo &nbsp;·&nbsp;
                  Ahorro anual: <strong style="color:#15803d">${clp(s.annualBenefitCLP)}</strong>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Próximos pasos -->
        <tr><td style="padding:0 32px 24px">
          <h2 style="margin:0 0 14px;font-size:14px;color:#374151;font-weight:700">¿Qué sigue?</h2>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:6px 0;vertical-align:top;width:28px">
                <span style="display:inline-block;width:22px;height:22px;background:#16a34a;border-radius:50%;text-align:center;line-height:22px;font-size:11px;color:#fff;font-weight:700">1</span>
              </td>
              <td style="padding:6px 0 6px 8px;font-size:13px;color:#374151">Un especialista te contactará en menos de <strong>24 horas hábiles</strong>.</td>
            </tr>
            <tr>
              <td style="padding:6px 0;vertical-align:top">
                <span style="display:inline-block;width:22px;height:22px;background:#16a34a;border-radius:50%;text-align:center;line-height:22px;font-size:11px;color:#fff;font-weight:700">2</span>
              </td>
              <td style="padding:6px 0 6px 8px;font-size:13px;color:#374151">Coordinamos una <strong>visita técnica gratuita</strong> en tu domicilio o empresa.</td>
            </tr>
            <tr>
              <td style="padding:6px 0;vertical-align:top">
                <span style="display:inline-block;width:22px;height:22px;background:#16a34a;border-radius:50%;text-align:center;line-height:22px;font-size:11px;color:#fff;font-weight:700">3</span>
              </td>
              <td style="padding:6px 0 6px 8px;font-size:13px;color:#374151">Recibes un <strong>presupuesto definitivo personalizado</strong> sin ningún compromiso.</td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
            <strong>Mercado Energy</strong> · Instaladores certificados · Sin compromiso<br/>
            Esta propuesta es estimativa. Los valores reales se determinarán en la visita técnica.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const recipient = process.env.LEAD_RECIPIENT_EMAIL ?? 'danilo.canessa@gmail.com';

  let body: LeadPayload;

  try {
    body = await request.json() as LeadPayload;
  } catch {
    return Response.json({ error: 'Payload inválido' }, { status: 400 });
  }

  if (!body.contact?.email) {
    return Response.json({ error: 'Email de contacto requerido' }, { status: 400 });
  }

  const displayName = body.customerCategory === 'natural'
    ? body.contact.name
    : body.contact.companyName;

  // Persist lead to Supabase (best-effort — don't fail the request if DB is down)
  try {
    const db = getSupabaseAdmin();
    await db.from('leads').insert({
      customer_category:  body.customerCategory,
      name:               displayName ?? null,
      contact_name:       body.contact.contactName ?? null,
      email:              body.contact.email,
      phone:              body.contact.phone ?? null,
      region_id:          body.contact.regionId ?? null,
      region_name:        body.simulation.regionName ?? null,
      city:               body.contact.city ?? null,
      commune:            body.contact.commune ?? null,
      tarifa:             body.supply.tarifa ?? null,
      distribuidora:      body.supply.distribuidora ?? null,
      avg_monthly_kwh:    body.averageMonthlyKWh,
      kit_size_kwp:       body.simulation.kitSizeKWp,
      kit_price_clp:      body.simulation.kitPriceCLP,
      monthly_benefit_clp: body.simulation.monthlyBenefitCLP,
      annual_benefit_clp:  body.simulation.annualBenefitCLP,
      payback_years:      body.simulation.paybackYears,
      coverage_percent:   body.simulation.coveragePercent,
      status:             'new',
      consumption_profile: body.consumption_profile ?? null,
      scenarios_json:      body.scenarios_json ?? null,
      future_consumption:  body.future_consumption ?? null,
      supply_details:      body.supply_details ?? null,
    });
  } catch (dbErr) {
    console.error('[leads/route] Supabase insert error:', dbErr);
  }

  try {
    const [operatorResult, clientResult] = await Promise.allSettled([
      resend.emails.send({
        from: 'Mercado Energy <onboarding@resend.dev>',
        to: [recipient],
        replyTo: body.contact.email,
        subject: `Nuevo lead solar — ${displayName ?? body.contact.email} (${body.simulation.regionName})`,
        html: buildEmailHtml(body),
      }),
      resend.emails.send({
        from: 'Mercado Energy <onboarding@resend.dev>',
        to: [body.contact.email],
        subject: 'Tu propuesta solar está lista — Mercado Energy',
        html: buildClientEmailHtml(body),
      }),
    ]);

    if (operatorResult.status === 'rejected') {
      console.error('[leads/route] Operator email error:', operatorResult.reason);
      return Response.json({ error: 'Error al enviar el email' }, { status: 500 });
    }
    if (clientResult.status === 'rejected') {
      console.error('[leads/route] Client confirmation email error:', clientResult.reason);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[leads/route] Resend error:', err);
    return Response.json({ error: 'Error al enviar el email' }, { status: 500 });
  }
}
