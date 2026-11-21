/*
 * Karam Store service worker — push notifications only.
 * It caches nothing and never intercepts requests, so the store loads exactly as before.
 */
const DEFAULT_URL = '/admin/orders';

/** Only paths on this site (a push payload can never send the user elsewhere). */
function safePath(url) {
  try {
    const u = new URL(url || DEFAULT_URL, self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search : DEFAULT_URL;
  } catch (e) {
    return DEFAULT_URL;
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'متجر كرم';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      lang: 'ar',
      dir: 'rtl',
      data: { url: safePath(data.url) },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = safePath(event.notification.data && event.notification.data.url);
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const app = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (app) {
        await app.focus();
        // The open app routes in place (no reload); a full navigation is the fallback
        app.postMessage({ type: 'karam:navigate', url: path });
        return undefined;
      }
      return self.clients.openWindow(target);
    })()
  );
});
