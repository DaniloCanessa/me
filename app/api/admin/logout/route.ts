import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirige a /admin/login en el MISMO host del request (funciona en
  // cualquier dominio: www.mercadoenergy.cl, .vercel.app o localhost).
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  const response = NextResponse.redirect(url);
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return response;
}
