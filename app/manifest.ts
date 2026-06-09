import type { MetadataRoute } from 'next';

// Manifest PWA. La app instalable apunta al backoffice (start_url /admin),
// con scope global para que el link de captura de gastos (fuera de /admin)
// también abra dentro de la app instalada.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mercado Energy',
    short_name: 'me',
    description: 'Backoffice de Mercado Energy: CRM, cotizaciones, proyectos y gastos.',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1d65c5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
