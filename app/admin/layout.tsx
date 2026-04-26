import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import AdminSidebar from '@/components/admin/AdminSidebar';

interface JwtPayload {
  sub: string;
  name: string;
  role: string;
  email: string;
}

async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? process.env.ADMIN_SECRET ?? ''
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
