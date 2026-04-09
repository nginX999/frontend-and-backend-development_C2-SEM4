// ============ КОНФИГУРАЦИЯ ============
const CACHE_NAME = 'notes-app-v1';
const OFFLINE_URL = '/';

// Ресурсы для кэширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  'https://unpkg.com/chota@latest',
  'https://unpkg.com/chota@latest/dist/chota.min.css'
];

// ============ СОБЫТИЕ INSTALL ============
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Установка Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] 💾 Кэширование статических ресурсов...');
        
        // Кэшируем каждый ресурс отдельно, чтобы один не завалил весь процесс
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
            console.log(`[SW] ✅ Закэширован: ${asset}`);
          } catch (error) {
            console.log(`[SW] ⚠️ Не удалось закэшировать: ${asset}`, error);
          }
        }
        
        // Кэшируем офлайн страницу
        try {
          const response = await fetch(OFFLINE_URL);
          if (response.ok) {
            await cache.put(OFFLINE_URL, response);
          }
        } catch (error) {
          console.log('[SW] ⚠️ Офлайн страница не закэширована');
        }
      })
      .then(() => {
        console.log('[SW] ✅ Кэширование завершено');
        return self.skipWaiting(); // Активируем сразу
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
      return self.clients.claim(); // Захватываем контроль над страницами
    })
  );
});

// ============ СОБЫТИЕ FETCH (перехват запросов) ============
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы не от нашего origin и не GET запросы
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
        // Сначала пробуем получить из сети
        const networkResponse = await fetch(event.request);
        
        // Если запрос успешен, обновляем кэш
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.log('[SW] 📡 Офлайн режим, берём из кэша:', event.request.url);
        
        // Если сеть недоступна, пытаемся получить из кэша
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Если ничего нет в кэше, возвращаем главную страницу
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

// ============ ОБРАБОТКА ОШИБОК ============
self.addEventListener('error', (error) => {
  console.error('[SW] Ошибка:', error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Необработанное обещание:', event.reason);
});