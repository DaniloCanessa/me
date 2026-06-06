import { getWhatsAppConfig } from '@/lib/db/config';

// Botón flotante de WhatsApp (click-to-chat, sin costo — no usa la API de pago).
// Número y mensaje configurables desde /admin/config (categoría WhatsApp),
// con fallback a NEXT_PUBLIC_WHATSAPP_NUMBER y un mensaje por defecto.
export default async function WhatsAppButton() {
  const { number, message } = await getWhatsAppConfig();
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-0 rounded-full bg-[#25d366] text-white shadow-lg shadow-[#25d366]/30 ring-1 ring-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-[#25d366]/40 hover:scale-105"
    >
      <span className="flex h-14 w-14 items-center justify-center">
        {/* Ícono oficial de WhatsApp */}
        <svg viewBox="0 0 32 32" fill="currentColor" className="h-7 w-7" aria-hidden="true">
          <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.46 1.71 6.4L3.2 28.8l6.58-1.67a12.74 12.74 0 0 0 6.22 1.6h.01c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.73-12.8-12.73Zm0 23.39h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9.99 1.04-3.8-.25-.4a10.55 10.55 0 0 1-1.63-5.67c0-5.87 4.78-10.65 10.66-10.65a10.6 10.6 0 0 1 10.64 10.66c0 5.87-4.78 10.58-10.76 10.58Zm5.84-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.51-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.44 5.45 4.82.76.33 1.36.53 1.82.67.77.24 1.46.21 2.01.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
        </svg>
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[12rem] group-hover:pr-5 group-hover:opacity-100">
        ¿Conversemos?
      </span>
    </a>
  );
}
