import { Resend } from 'resend';

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  type: 'natural' | 'business';
  message: string;
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const recipient = process.env.LEAD_RECIPIENT_EMAIL ?? 'danilo.canessa@gmail.com';

  let body: ContactPayload;
  try {
    body = await request.json() as ContactPayload;
  } catch {
    return Response.json({ error: 'Payload inválido' }, { status: 400 });
  }

  if (!body.name || !body.email || !body.message) {
    return Response.json({ error: 'Nombre, email y mensaje son requeridos' }, { status: 400 });
  }

  const typeLabel = body.type === 'business' ? 'Empresa' : 'Persona natural';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:#1d65c5;padding:24px 32px">
          <p style="margin:0;color:#ade1ed;font-size:13px">Nuevo mensaje de contacto — Mercado Energy</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px">${body.name}</h1>
          <p style="margin:4px 0 0;color:#ade1ed;font-size:13px">${typeLabel}</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px">Email</td><td style="padding:4px 0;font-size:13px"><a href="mailto:${body.email}" style="color:#1d65c5">${body.email}</a></td></tr>
            ${body.phone ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Teléfono</td><td style="padding:4px 0;color:#111827;font-size:13px"><a href="tel:${body.phone}" style="color:#1d65c5">${body.phone}</a></td></tr>` : ''}
          </table>
          <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;border-left:3px solid #1d65c5">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap">${body.message}</p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;color:#9ca3af">Mensaje recibido desde el formulario de contacto de <strong>mercadoenergy.cl</strong></p>
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
      replyTo: body.email,
      subject: `Contacto web — ${body.name} (${typeLabel})`,
      html,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[contact/route] Resend error:', err);
    return Response.json({ error: 'Error al enviar el mensaje' }, { status: 500 });
  }
}
