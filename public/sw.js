const CACHE = 'irong-cc-v4';
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

self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Iron G — New Request', {
      body: data.body || 'A new request has arrived.',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      data: { url: data.url || '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url.includes('irong-cc') && 'focus' in c) {
          return c.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://irong-cc.westcal98.workers.dev/notifications');
      }
    })
  );
});
