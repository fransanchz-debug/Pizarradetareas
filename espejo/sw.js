// Recibe las notificaciones push y las muestra. No guarda nada en caché ni intercepta la red.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { titulo: 'Pizarra de Tareas', cuerpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Pizarra de Tareas', {
    body: d.cuerpo || '',
    tag: d.etiqueta || 'aviso',
    renotify: true,
    icon: '../iconos/icono-192.png',
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    for (const v of ventanas) if ('focus' in v) return v.focus();
    return self.clients.openWindow(url);
  }));
});
