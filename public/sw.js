const CACHE = 'irong-cc-v2';
const ASSETS = ['/', '/index.html', '/app.js', '/styles.css', '/manifest.json'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).then(function(r) {
      var clone = r.clone();
      caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      return r;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
