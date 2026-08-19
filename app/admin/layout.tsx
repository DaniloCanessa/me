import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import AdminShell from '@/components/admin/AdminShell';
import { countPendingExpenses, countUnclassifiedPurchases } from '@/lib/db/expenses';

// El backoffice nunca debe indexarse en buscadores.
export const metadata = { robots: { index: false, follow: false } };

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

  const [pendingExpenses, unclassifiedInvoices] = await Promise.all([
    countPendingExpenses(),
    countUnclassifiedPurchases(),
  ]);

  return (
    <AdminShell userName={user.name} userRole={user.role} pendingExpenses={pendingExpenses} unclassifiedInvoices={unclassifiedInvoices}>
      {children}
    </AdminShell>
  );
}
