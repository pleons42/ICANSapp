// ICANS Grading App – Service Worker v2.3
// Network-first für index.html, Cache-first für Assets

var CACHE_NAME = 'icans-v2.3';
var STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/banner.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// Install: statische Assets cachen (OHNE index.html – die kommt immer frisch vom Server)
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(STATIC_ASSETS.filter(function(f) {
          return f.startsWith('./');
        })).then(function() {
          return Promise.all(
            STATIC_ASSETS.filter(function(f) { return !f.startsWith('./'); })
              .map(function(url) { return cache.add(url).catch(function() {}); })
          );
        });
      })
      .then(function() {
        // Sofort aktiv werden, ohne auf Tab-Schließen zu warten
        return self.skipWaiting();
      })
  );
});

// Activate: Alle alten Caches löschen
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Alle offenen Clients sofort übernehmen
      return self.clients.claim();
    })
  );
});

// Fetch: 
//   index.html → NETWORK FIRST (immer aktuell vom Server)
//   Alles andere → Cache first, dann Network
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);
  var isIndexHtml = url.pathname.endsWith('/') ||
                    url.pathname.endsWith('/index.html') ||
                    url.pathname === url.origin + '/';

  if (isIndexHtml) {
    // Network-first: immer frisch vom Server laden
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(function(resp) {
          if (resp && resp.status === 200) {
            // Auch im Cache aktualisieren für Offline-Fallback
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return resp;
        })
        .catch(function() {
          // Offline-Fallback aus Cache
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Alle anderen Requests: Cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Im Hintergrund aktualisieren
        fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200) {
            caches.open(CACHE_NAME).then(function(c) { c.put(e.request, resp); });
          }
        }).catch(function() {});
        return cached;
      }
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, resp.clone()); });
        }
        return resp;
      }).catch(function() {});
    })
  );
});
