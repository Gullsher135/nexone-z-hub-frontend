// NexoneZ Hub service worker: shows notifications even when the website is closed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// Needed so phones and computers offer to install the site as an app (an installed app gets alerts more reliably).
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(
    self.registration.showNotification(d.title || 'NexoneZ Hub', {
      body: d.body || '',
      icon: '/hub-icon-512.png',
      badge: '/hub-icon.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      vibrate: [120, 60, 120],
      timestamp: Date.now(),
      data: { url: d.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) return open.focus().then(() => ('navigate' in open ? open.navigate(url) : undefined));
      return self.clients.openWindow(url);
    })
  );
});
