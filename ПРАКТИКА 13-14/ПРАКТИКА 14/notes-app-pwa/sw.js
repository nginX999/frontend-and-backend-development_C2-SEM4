// ============ КОНФИГУРАЦИЯ ============
const CACHE_NAME = 'notes-app-v2';
const OFFLINE_URL = '/';

// Ресурсы для кэширования при установке (ВКЛЮЧАЕМ ИКОНКИ И MANIFEST)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  'https://unpkg.com/chota@latest',
  'https://unpkg.com/chota@latest/dist/chota.min.css',
  // Иконки
  '/icons/favicon.ico',
  '/icons/icon-16x16.png',
  '/icons/icon-32x32.png',
  '/icons/icon-48x48.png',
  '/icons/icon-64x64.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// ============ СОБЫТИЕ INSTALL ============
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Установка Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] 💾 Кэширование статических ресурсов...');
        
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
            console.log(`[SW] ✅ Закэширован: ${asset}`);
          } catch (error) {
            console.log(`[SW] ⚠️ Не удалось закэшировать: ${asset}`, error);
          }
        }
      })
      .then(() => {
        console.log('[SW] ✅ Кэширование завершено');
        return self.skipWaiting();
      })
  );
});

// ============ СОБЫТИЕ ACTIVATE ============
self.addEventListener('activate', (event) => {
  console.log('[SW] 🚀 Активация Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] 🗑️ Удаление старого кэша: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Service Worker активирован и готов к работе');
      return self.clients.claim();
    })
  );
});

// ============ СОБЫТИЕ FETCH ============
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('chota')) {
    return;
  }
  
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.log('[SW] 📡 Офлайн режим, берём из кэша:', event.request.url);
        
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        return new Response('Вы офлайн. Некоторые ресурсы недоступны.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })()
  );
});

self.addEventListener('error', (error) => {
  console.error('[SW] Ошибка:', error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Необработанное обещание:', event.reason);
});