import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

/**
 * Valida la sesión de admin (cookie `admin_token` firmada con JWT_SECRET/ADMIN_SECRET).
 * Server-side only (Server Components y Route Handlers).
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? process.env.ADMIN_SECRET ?? ''
    );
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
