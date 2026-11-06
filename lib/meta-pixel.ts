// Píxel de Meta (Facebook/Instagram Ads) y consentimiento de cookies.
// El ID no es secreto: queda visible en el HTML de cualquier sitio que use el píxel.
export const META_PIXEL_ID = '1021948103465103';

// Preferencia del visitante, guardada en localStorage. Sin valor = no ha decidido.
const CONSENT_KEY = 'me-cookie-consent';
export const CONSENT_EVENT = 'me-cookie-consent-change';

export type CookieConsent = 'granted' | 'denied' | null;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function getCookieConsent(): CookieConsent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(value: CookieConsent) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Navegador sin localStorage (modo privado estricto): la preferencia dura la visita.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// Eventos estándar de Meta (Lead, Contact…). No hace nada si el píxel no se cargó:
// visitante que rechazó, back-office o servidor.
export function trackMeta(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) window.fbq('track', event, params);
}

// Eventos propios (no estándar), p. ej. 'SimulacionCompletada'.
export function trackMetaCustom(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) window.fbq('trackCustom', event, params);
}
