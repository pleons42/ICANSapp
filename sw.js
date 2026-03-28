// ICANS Grading App – Service Worker v2.7
var CACHE_NAME = 'icans-v2.7';
var STATIC_ASSETS = [
  './manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/banner.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE_NAME).then(function(cache){return cache.addAll(STATIC_ASSETS.filter(function(f){return f.startsWith('./');})).then(function(){return Promise.all(STATIC_ASSETS.filter(function(f){return !f.startsWith('./');}).map(function(url){return cache.add(url).catch(function(){});}));});}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;var url=new URL(e.request.url);var isIndex=url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');if(isIndex){e.respondWith(fetch(e.request,{cache:'no-store'}).then(function(resp){if(resp&&resp.status===200){var cl=resp.clone();caches.open(CACHE_NAME).then(function(c){c.put(e.request,cl);});}return resp;}).catch(function(){return caches.match('./index.html');}));return;}e.respondWith(caches.match(e.request).then(function(cached){if(cached){fetch(e.request).then(function(r){if(r&&r.status===200)caches.open(CACHE_NAME).then(function(c){c.put(e.request,r);});}).catch(function(){});return cached;}return fetch(e.request).then(function(r){if(r&&r.status===200&&r.type!=='opaque')caches.open(CACHE_NAME).then(function(c){c.put(e.request,r.clone());});return r;}).catch(function(){});}));});
