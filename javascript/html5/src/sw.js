const CACHE_NAME = 'dice-cup-five-source-v6';
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/styles.css',
  './main.js',
  './game.js',
  './dice-scene.js',
  './sound.js',
  './manifest.webmanifest',
  './img/dice-icon.svg',
  './thirdparty/three/three.module.js',
  './thirdparty/three/three.core.js',
  './thirdparty/three/addons/geometries/RoundedBoxGeometry.js',
  './thirdparty/three/LICENSE',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('dice-cup-five-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).origin !== self.location.origin
  ) {
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
