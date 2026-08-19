import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';
import { EMAIL, emailShell, emailHeader, emailFooter } from '@/lib/email-brand';

export async function POST(req: NextRequest) {
  // Ruta pública (el simulador la usa para enviar el informe al cliente).
  // Sin protección sería un relay de correo: se limita por IP y se acotan
  // formato/tamaño para evitar abuso como spam desde el dominio.
  const rl = rateLimit(`send-report:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { pdfBase64, clientEmail, clientName } = await req.json() as {
    pdfBase64: string;
    clientEmail: string;
    clientName: string;
  };

  const emailOk = typeof clientEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail);
  if (!emailOk) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  if (typeof pdfBase64 !== 'string' || pdfBase64.length > 7_000_000) {
    return NextResponse.json({ error: 'Adjunto inválido o demasiado grande' }, { status: 413 });
  }

  const { error } = await resend.emails.send({
    from: 'Mercado Energy <notificaciones@send.mercadoenergy.cl>',
    to: clientEmail,
    replyTo: process.env.LEAD_RECIPIENT_EMAIL ?? 'danilo.canessa@gmail.com',
    subject: 'Tu simulación solar — Mercado Energy',
    html: emailShell(`
${emailHeader({
  eyebrow: 'Informe de simulación',
  title: `Hola, ${clientName}`,
  subtitle: 'Tu informe solar fotovoltaico va adjunto en este correo',
})}

        <tr><td style="padding:28px 32px 24px">
          <p style="margin:0 0 16px;font-size:14px;color:${EMAIL.text};line-height:1.6">
            Adjunto encontrarás el informe completo de tu simulación solar fotovoltaica,
            incluyendo la solución recomendada para tu caso, el análisis financiero y la
            comparación de alternativas disponibles.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:${EMAIL.text};line-height:1.6">
            Si tienes preguntas o quieres coordinar una visita técnica gratuita,
            responde este correo y un especialista te contactará a la brevedad.
          </p>
          <p style="margin:0;font-size:13px;color:${EMAIL.gray}">Mercado Energy — Equipo técnico</p>
        </td></tr>

${emailFooter('<strong>Mercado Energy</strong> · Instaladores certificados · Sin compromiso<br/>Los valores del informe son estimativos y se confirman en la visita técnica.')}
`),
    attachments: [
      {
        filename: `simulacion-solar-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
