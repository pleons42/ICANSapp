var CACHE = 'icans-v1.3';
var FILES = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/banner.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      var local = FILES.filter(function(f){return f.startsWith('./');});
      var cdn   = FILES.filter(function(f){return !f.startsWith('./');});
      return cache.addAll(local).then(function(){
        return Promise.all(cdn.map(function(url){
          return cache.add(url).catch(function(){});
        }));
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){return k!==CACHE;})
            .map(function(k){return caches.delete(k);})
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if (cached) {
        fetch(e.request).then(function(resp){
          if (resp && resp.status===200){
            caches.open(CACHE).then(function(c){c.put(e.request,resp);});
          }
        }).catch(function(){});
        return cached;
      }
      return fetch(e.request).then(function(resp){
        if (resp && resp.status===200 && resp.type!=='opaque'){
          var clone = resp.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,clone);});
        }
        return resp;
      }).catch(function(){
        if (e.request.destination==='document')
          return caches.match('./index.html');
      });
    })
  );
});
