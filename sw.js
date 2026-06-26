self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => clients.claim());
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));

self.addEventListener('push', e => {
  if (!e.data) return;
  const { title, body, orderId, url } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logotipo.png',
      badge: '/logotipo.png',
      tag: orderId ?? 'acai-order',
      renotify: true,
      data: { url: url ?? '/index.html' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = e.notification.data?.url ?? '/index.html';
      for (const c of list) {
        if (c.url.includes(self.location.origin)) { c.focus(); return; }
      }
      return clients.openWindow(url);
    })
  );
});
