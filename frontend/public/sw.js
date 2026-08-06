// Polska Auto Leads Engine — Service Worker (PWA)
const CACHE_NAME = 'pale-v3';
const OFFLINE_URL = '/';
const QUEUE_DB = 'pale-offline-queue';
const QUEUE_STORE = 'requests';
const SYNC_TAG = 'pale-sync-queue';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueRequest(request) {
  const db = await openQueueDb();
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = ['GET', 'HEAD'].includes(request.method) ? null : await request.clone().text();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add({
      url: request.url,
      method: request.method,
      headers,
      body,
      queuedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueuedRequests() {
  const db = await openQueueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteQueuedRequest(id) {
  const db = await openQueueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function processQueuedRequests() {
  const queued = await getQueuedRequests();
  for (const item of queued) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (response.ok) {
        await deleteQueuedRequest(item.id);
      }
    } catch (error) {
      break;
    }
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        await queueRequest(event.request);
        if (self.registration.sync) {
          try {
            await self.registration.sync.register(SYNC_TAG);
          } catch (error) {
            await processQueuedRequests();
          }
        }
        return new Response(JSON.stringify({ queued: true, offline: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  const url = new URL(event.request.url);

  // API calls: network-first, no cache
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // App shell: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached || new Response('Offline', { status: 503 }));
        return cached || network;
      })
    )
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processQueuedRequests());
  }
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data?.json() || {};
    } catch (error) {
      return { title: 'Polska Auto Leads Engine', body: event.data?.text() || 'Nowe powiadomienie systemowe' };
    }
  })();
  const title = payload.title || 'Polska Auto Leads Engine';
  const options = {
    body: payload.body || 'Masz nowe zdarzenie w systemie.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
