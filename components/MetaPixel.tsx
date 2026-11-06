'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import {
  META_PIXEL_ID,
  CONSENT_EVENT,
  getCookieConsent,
  setCookieConsent,
  trackMeta,
  type CookieConsent,
} from '@/lib/meta-pixel';

// Rutas internas: no se mide ni se muestra el aviso (tus propias visitas
// ensuciarían las métricas de los anuncios).
const RUTAS_INTERNAS = ['/admin', '/lab'];

function subscribe(cb: () => void) {
  window.addEventListener(CONSENT_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CONSENT_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

// En el servidor no se conoce la preferencia: 'ssr' evita que el aviso
// parpadee antes de leer localStorage.
const getServerSnapshot = (): CookieConsent | 'ssr' => 'ssr';

// Píxel de Meta + aviso de cookies. El píxel se carga solo si el visitante acepta
// (Ley 21.719). Mide PageView en cada navegación y Contact al tocar WhatsApp;
// Lead y SimulacionCompletada se disparan desde los formularios (trackMeta).
export default function MetaPixel() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribe, getCookieConsent, getServerSnapshot);
  const interna = RUTAS_INTERNAS.some((r) => pathname.startsWith(r));
  const activo = consent === 'granted' && !interna;

  // El código base registra el primer PageView; los siguientes son navegaciones
  // del lado del cliente, que no recargan la página.
  const ultimaRuta = useRef<string | null>(null);
  useEffect(() => {
    if (!activo) return;
    if (ultimaRuta.current !== null && ultimaRuta.current !== pathname) trackMeta('PageView');
    ultimaRuta.current = pathname;
  }, [activo, pathname]);

  // Clic en cualquier enlace a WhatsApp (botón flotante y otros) → Contact.
  useEffect(() => {
    if (!activo) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="https://wa.me/"]');
      if (a) trackMeta('Contact', { content_name: 'WhatsApp' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [activo]);

  if (interna) return null;

  return (
    <>
      {activo && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}

      {consent === null && (
        <div
          role="dialog"
          aria-label="Aviso de cookies"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-[60] rounded-2xl bg-white p-5 ring-1 ring-[#b0cedd]/40 shadow-[0_16px_48px_rgba(16,40,80,0.18)]"
        >
          <p className="text-sm text-gray-600 leading-relaxed">
            Usamos cookies de Meta para medir nuestros anuncios y mostrarte información relevante.
            Puedes rechazarlas: el sitio y el simulador funcionan igual.{' '}
            <Link href="/privacidad" className="text-[#389fe0] hover:underline">Más información</Link>
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setCookieConsent('denied')}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#010101] ring-1 ring-[#b0cedd] hover:bg-[#f4f8fb] transition-colors"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => setCookieConsent('granted')}
              className="flex-1 rounded-xl bg-[#1d65c5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#389fe0] transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
