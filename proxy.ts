import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const PUBLIC_ADMIN = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];
  if (pathname.startsWith('/admin') && !PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) return redirectToLogin(request);

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET ?? process.env.ADMIN_SECRET ?? ''
      );
      await jwtVerify(token, secret);
    } catch {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
