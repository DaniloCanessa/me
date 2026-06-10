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

export interface AdminUser {
  sub: string;
  name: string;
  role: string;
  email: string;
}

/** Devuelve el usuario admin de la sesión (o null). Server-side only. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? process.env.ADMIN_SECRET ?? ''
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AdminUser;
  } catch {
    return null;
  }
}
