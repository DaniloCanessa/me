'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const NAV_MAIN = [
  { href: '/admin/leads',    label: 'Leads',        icon: '📥' },
  { href: '/admin/clients',  label: 'Clientes',      icon: '👥' },
  { href: '/admin/quotes',   label: 'Cotizaciones',  icon: '📋' },
  { href: '/admin/projects', label: 'Proyectos',     icon: '🏗️' },
  { href: '/admin/gastos',   label: 'Gastos',        icon: '🧾' },
  { href: '/admin/finanzas', label: 'Finanzas',      icon: '📊' },
  { href: '/admin/licitaciones', label: 'Licitaciones', icon: '🏛️' },
  { href: '/admin/simulator', label: 'Simulador',    icon: '⚡' },
];

const NAV_CONFIG = [
  { href: '/admin/products', label: 'Productos',     icon: '☀️' },
  { href: '/admin/config',   label: 'Configuración', icon: '⚙️' },
];

function NavItem({
  href,
  label,
  icon,
  onNavigate,
  badge,
}: {
  href: string;
  label: string;
  icon: string;
  onNavigate?: () => void;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-[#389fe0]/10 text-[#1d65c5]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-base leading-none w-5 text-center">{icon}</span>
      {label}
      {badge ? (
        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#389fe0] text-white text-[10px] font-semibold">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function AdminSidebar({
  userName,
  userRole,
  onNavigate,
  pendingExpenses = 0,
}: {
  userName: string;
  userRole: string;
  onNavigate?: () => void;
  pendingExpenses?: number;
}) {
  return (
    <aside className="w-56 h-full shrink-0 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <Link href="/admin">
          <Image
            src="/images/logotipo.png"
            alt="Mercado Energy"
            width={180} height={52}
            className="h-14 w-auto"
          />
        </Link>
        <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-widest">
          Back-office
        </p>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          CRM
        </p>
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} {...item} onNavigate={onNavigate}
            badge={item.href === '/admin/gastos' ? pendingExpenses : undefined} />
        ))}

        <p className="px-3 mt-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Configuración
        </p>
        {NAV_CONFIG.map((item) => (
          <NavItem key={item.href} {...item} onNavigate={onNavigate} />
        ))}

        {userRole === 'admin' && (
          <>
            <p className="px-3 mt-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Sistema
            </p>
            <NavItem href="/admin/users" label="Usuarios" icon="🔑" onNavigate={onNavigate} />
          </>
        )}
      </nav>

      {/* Usuario + Logout */}
      <div className="px-2 py-3 border-t border-gray-100">
        <div className="px-3 py-1.5 mb-1">
          <p className="text-xs font-medium text-gray-700 truncate">{userName}</p>
          <p className="text-[10px] text-gray-400 capitalize">{userRole}</p>
        </div>
        <a
          href="/api/admin/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          <span className="text-base leading-none w-5 text-center">→</span>
          Cerrar sesión
        </a>
      </div>
    </aside>
  );
}
