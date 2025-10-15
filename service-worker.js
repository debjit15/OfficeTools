const CACHE_NAME = 'geotag-tools-v1';

const urlsToCache = [
  './',
  './index.html',
  './geo.html',
  './Assets/index.css',
  './Assets/geo.css',
  './manifest.json',
  './Assets/tool.js',
  './Assets/geo.js',
  './offline.html',
  './Assets/icons/icon-72x72.png',
  './Assets/icons/icon-96x96.png',
  './Assets/icons/icon-128x128.png',
  './Assets/icons/icon-192x192.png',
  './Assets/icons/icon-256x256.png',
  './Assets/icons/icon-384x384.png',
  './Assets/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
  'https://fonts.gstatic.com/s/materialsymbolsoutlined/v54/kJEyBoK2Jz0j6eIq4mwyHbuZ5U1akQ.woff2',
  // Leaflet library files
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing and caching essential files...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('Cache add failed:', err))
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached file if found
        if (response) return response;

        // Otherwise, fetch from network and cache it
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => caches.match('/offline.html')); // fallback offline
      })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating and cleaning old caches...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ))
  );
});