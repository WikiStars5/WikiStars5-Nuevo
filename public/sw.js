// Define el nombre de la caché
const CACHE_NAME = 'wikistars5-cache-v1';

// Lista de URLs para cachear
const urlsToCache = [
  '/',
  '/offline.html' // Una página para mostrar cuando no hay conexión
];

// Instalar el Service Worker y cachear los recursos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Estrategia de caché: Cache First para recursos de Firebase Storage
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Estrategia CacheFirst para Firebase Storage
  if (requestUrl.hostname === 'firebasestorage.googleapis.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          // Si está en caché, lo devuelve. Si no, lo busca, lo cachea y lo devuelve.
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return; // Termina aquí para esta regla
  }

  // Estrategia NetworkFirst para todo lo demás (asegura contenido actualizado)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la petición a la red fue exitosa, la cacheamos y la devolvemos
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Si la red falla, intentamos servir desde la caché
        return caches.match(event.request).then((response) => {
          // Si el recurso está en la caché, lo devolvemos. Si no, la página offline.
          return response || caches.match('/offline.html');
        });
      })
  );
});

// Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
