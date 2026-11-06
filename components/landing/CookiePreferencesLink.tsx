'use client';

import { setCookieConsent } from '@/lib/meta-pixel';

// Borra la preferencia y recarga: vuelve a aparecer el aviso de cookies y,
// si antes había aceptado, el píxel ya cargado deja de correr.
export default function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={() => {
        setCookieConsent(null);
        window.location.reload();
      }}
      className="hover:text-[#389fe0] transition-colors"
    >
      Preferencias de cookies
    </button>
  );
}
