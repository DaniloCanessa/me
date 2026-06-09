// Service worker mínimo: habilita la instalación de la PWA.
// Sin caché offline por ahora (Fase 1). Las notificaciones push se
// agregarán en la Fase 3 sumando los listeners 'push' y 'notificationclick'.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener de fetch sin intervención: su mera presencia hace que la app
// cumpla los criterios de instalación de los navegadores.
self.addEventListener('fetch', () => {});
