'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface NavbarProps {
  /** 'transparent' flota sobre el video del hero (texto blanco). 'solid' tiene fondo para páginas internas. */
  variant?: 'transparent' | 'solid';
}

const LINKS = [
  { href: '/soluciones', label: 'Soluciones' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export default function Navbar({ variant = 'solid' }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const isTransparent = variant === 'transparent';
  const linkColor = isTransparent
    ? 'text-white hover:text-[#ade1ed]'
    : 'text-[#010101] hover:text-[#389fe0]';

  return (
    <nav
      className={
        isTransparent
          ? 'absolute top-0 left-0 right-0 z-20 px-6 py-5'
          : 'sticky top-0 z-30 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-[#b0cedd]/40'
      }
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image
            src={isTransparent ? '/images/mercadoenergy-blanco.png' : '/images/logotipo.png'}
            alt="Mercado Energy"
            width={300}
            height={isTransparent ? 91 : 90}
            className={isTransparent ? 'h-24 md:h-28 w-auto' : 'h-16 md:h-20 w-auto'}
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`${linkColor} transition-colors`}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/simulator"
            className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-5 py-2 rounded-xl transition-colors"
          >
            Simulador
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
          className={`md:hidden p-2 rounded-lg ${isTransparent ? 'text-white' : 'text-[#010101]'}`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-3 mx-auto max-w-6xl bg-white rounded-2xl border border-[#b0cedd]/40 shadow-lg p-4 flex flex-col gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-[#010101] hover:bg-[#dde3e9] rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/simulator"
            onClick={() => setOpen(false)}
            className="bg-[#389fe0] hover:bg-[#1d65c5] text-white text-center px-5 py-3 rounded-xl text-sm font-semibold transition-colors mt-2"
          >
            Simulador
          </Link>
        </div>
      )}
    </nav>
  );
}
