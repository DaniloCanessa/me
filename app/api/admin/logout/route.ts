import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'));
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return response;
}
