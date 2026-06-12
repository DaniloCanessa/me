import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from('users')
    .select('id, name, email, is_active')
    .eq('email', email.toLowerCase().trim())
    .single();

  // Siempre retornar ok para no revelar si el email existe
  if (!user || !user.is_active) return NextResponse.json({ ok: true });

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await db.from('users').update({
    reset_token:         token,
    reset_token_expires: expires.toISOString(),
  }).eq('id', user.id);

  const origin   = new URL(request.url).origin;
  const resetUrl = `${origin}/admin/reset-password?token=${token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    'Mercado Energy <notificaciones@send.mercadoenergy.cl>',
    to:      user.email,
    subject: 'Restablecer contraseña — Mercado Energy Back-office',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1d65c5;margin-bottom:8px;">Restablecer contraseña</h2>
        <p style="color:#555;font-size:14px;line-height:1.6;">
          Hola ${user.name},<br/>
          Recibimos una solicitud para restablecer tu contraseña del back-office de Mercado Energy.
        </p>
        <a href="${resetUrl}"
          style="display:inline-block;margin:20px 0;padding:12px 24px;background:#389fe0;color:white;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
          Restablecer contraseña
        </a>
        <p style="color:#999;font-size:12px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
        <p style="color:#ccc;font-size:11px;word-break:break-all;">${resetUrl}</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
