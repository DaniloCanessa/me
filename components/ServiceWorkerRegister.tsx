'use client';

import { useEffect } from 'react';

// Registra el service worker en cliente para habilitar la instalación de la PWA.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => console.error('[sw] registro falló:', err));
    }
  }, []);

  return null;
}
