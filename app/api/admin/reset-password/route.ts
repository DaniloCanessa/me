import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const { token, password } = await request.json() as { token?: string; password?: string };

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from('users')
    .select('id, reset_token_expires')
    .eq('reset_token', token)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 400 });
  }

  if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return NextResponse.json({ error: 'El enlace ha expirado. Solicita uno nuevo.' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  await db.from('users').update({
    password_hash,
    reset_token:         null,
    reset_token_expires: null,
    updated_at:          new Date().toISOString(),
  }).eq('id', user.id);

  return NextResponse.json({ ok: true });
}
