'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AdminSidebar from './AdminSidebar';

// Shell del backoffice: en escritorio el sidebar es fijo (igual que antes);
// en móvil se convierte en un drawer off-canvas con barra superior + hamburguesa.
export default function AdminShell({
  userName,
  userRole,
  pendingExpenses = 0,
  children,
}: {
  userName: string;
  userRole: string;
  pendingExpenses?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Backdrop (solo móvil, con el drawer abierto) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: off-canvas en móvil, estático en escritorio */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar userName={userName} userRole={userRole} pendingExpenses={pendingExpenses} onNavigate={() => setOpen(false)} />
      </div>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior (solo móvil) */}
        <header className="md:hidden flex items-center gap-3 h-14 shrink-0 border-b border-gray-100 bg-white px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/admin" className="flex items-center">
            <Image src="/images/logotipo.png" alt="Mercado Energy" width={130} height={38} className="h-8 w-auto" priority />
          </Link>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
