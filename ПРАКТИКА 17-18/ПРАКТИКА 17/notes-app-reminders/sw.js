const CACHE_NAME = 'notes-cache-v4';
const DYNAMIC_CACHE_NAME = 'dynamic-content-v1';

const STATIC_ASSETS = [
  '/', '/index.html', '/app.js', '/manifest.json',
  '/icons/launchericon-48x48.png', '/icons/launchericon-72x72.png', '/icons/launchericon-96x96.png',
  '/icons/launchericon-128x128.png', '/icons/launchericon-144x144.png', '/icons/launchericon-152x152.png',
  '/icons/launchericon-192x192.png', '/icons/launchericon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(cacheNames => Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) return caches.delete(cacheName);
    })
  )).then(() => self.clients.claim()));
});

self.addEventListener('push', (event) => {
  let data = { title: '📝 Новая заметка', body: '', reminderId: null };
  if (event.data) {
    try { data = event.data.json(); } catch(e) { data.body = event.data.text(); }
  }
  
  const options = {
    body: data.body,
    icon: '/icons/icon-152x152.png',
    badge: '/icons/icon-48x48.png',
    vibrate: [200, 100, 200],
    data: { reminderId: data.reminderId, url: '/' }
  };
  
  if (data.reminderId) {
    options.actions = [{ action: 'snooze', title: '⏰ Отложить на 5 минут' }];
  }
  
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const reminderId = notification.data?.reminderId;
  notification.close();
  
  if (action === 'snooze' && reminderId) {
    event.waitUntil(
      fetch('/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminderId })
      }).then(response => {
        if (response.ok) {
          self.registration.showNotification('⏰ Напоминание отложено', {
            body: 'Вы получите его через 5 минут',
            icon: '/icons/icon-152x152.png'
          });
        }
      }).catch(err => console.error(err))
    );
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  
  if (url.pathname.startsWith('/content/')) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        const clone = networkResponse.clone();
        caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.put(event.request, clone));
        return networkResponse;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || caches.match('/content/home.html');
      })
    );
    return;
  }
  
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});