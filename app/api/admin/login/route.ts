import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Anti fuerza-bruta: máx. 10 intentos por IP cada 15 min.
  const rl = rateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { email, password } = await request.json() as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from('users')
    .select('id, email, name, role, password_hash, is_active')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!user || !user.is_active) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  await db.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? process.env.ADMIN_SECRET ?? ''
  );

  const token = await new SignJWT({
    sub:   user.id,
    name:  user.name,
    role:  user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);

  const response = NextResponse.json({ ok: true, name: user.name, role: user.role });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 12,
  });
  return response;
}
