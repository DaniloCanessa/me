import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { pdfBase64, clientEmail, clientName } = await req.json() as {
    pdfBase64: string;
    clientEmail: string;
    clientName: string;
  };

  const { error } = await resend.emails.send({
    from: 'Mercado Energy <onboarding@resend.dev>',
    to: clientEmail,
    replyTo: process.env.LEAD_RECIPIENT_EMAIL ?? 'danilo.canessa@gmail.com',
    subject: 'Tu simulación solar — Mercado Energy',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <div style="background:#16a34a;padding:24px 32px;border-radius:8px 8px 0 0">
          <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Mercado Energy</p>
          <p style="color:#bbf7d0;font-size:13px;margin:4px 0 0">Simulador Solar Chile</p>
        </div>
        <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p style="font-size:15px;margin:0 0 16px">Hola <strong>${clientName}</strong>,</p>
          <p style="color:#374151;line-height:1.6;margin:0 0 16px">
            Adjunto encontrarás el informe completo de tu simulación solar fotovoltaica,
            incluyendo la solución recomendada para tu caso, el análisis financiero y la
            comparación de alternativas disponibles.
          </p>
          <p style="color:#374151;line-height:1.6;margin:0 0 24px">
            Si tienes preguntas o quieres coordinar una visita técnica gratuita,
            responde este correo y un especialista te contactará a la brevedad.
          </p>
          <p style="color:#6b7280;font-size:13px;margin:0">Mercado Energy — Equipo técnico</p>
        </div>
      </div>
    `,
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
