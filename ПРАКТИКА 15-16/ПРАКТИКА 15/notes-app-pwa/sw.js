const CACHE_NAME = 'notes-cache-v2';
const DYNAMIC_CACHE_NAME = 'dynamic-content-v1';

// Статические ресурсы (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/launchericon-48x48.png',
  '/icons/launchericon-72x72.png',
  '/icons/launchericon-96x96.png',
  '/icons/launchericon-128x128.png',   // ← ДОБАВИТЬ
  '/icons/launchericon-144x144.png',
  '/icons/launchericon-152x152.png',   // ← ДОБАВИТЬ
  '/icons/launchericon-192x192.png',
  '/icons/launchericon-512x512.png'
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
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log(`[SW] 🗑️ Удаление старого кэша: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Service Worker активирован');
      return self.clients.claim();
    })
  );
});

// ============ СОБЫТИЕ FETCH (с поддержкой App Shell) ============
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Пропускаем запросы к другим источникам (например, CDN)
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Динамические страницы (content/*) – стратегия Network First
  if (url.pathname.startsWith('/content/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Кэшируем свежий ответ
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(async () => {
          // Если сеть недоступна, берём из кэша
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Если нет в кэше, возвращаем home как fallback
          return caches.match('/content/home.html');
        })
    );
    return;
  }
  
  // Статические ресурсы – стратегия Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
      .catch(() => {
        // Если совсем ничего нет, возвращаем главную страницу
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Вы офлайн. Некоторые ресурсы недоступны.', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

self.addEventListener('error', (error) => {
  console.error('[SW] Ошибка:', error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Необработанное обещание:', event.reason);
});