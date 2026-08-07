const CACHE_NAME = 'pale-v31';
const OFFLINE_URL = '/offline.html';
const QUEUE_DB = 'pale-offline-queue';
const QUEUE_STORE = 'requests';
const SYNC_TAG = 'pale-sync-queue';

const PRECACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function notifyClients(message) {
  return self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'SYNC_STATUS', message }));
  });
}

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
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
    tx.objectStore(QUEUE_STORE).add({ url: request.url, method: request.method, headers, body, queuedAt: new Date().toISOString() });
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
  if (queued.length) await notifyClients(`Trwa synchronizacja ${queued.length} zapisanych działań…`);
  for (const item of queued) {
    try {
      const response = await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
      if (response.ok) await deleteQueuedRequest(item.id);
    } catch {
      break;
    }
  }
  const remaining = await getQueuedRequests();
  await notifyClients(remaining.length ? `Pozostało ${remaining.length} działań do synchronizacji.` : 'Synchronizacja offline zakończona.');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        await queueRequest(request);
        await notifyClients('Zapisano działanie offline.');
        if (self.registration.sync) {
          try {
            await self.registration.sync.register(SYNC_TAG);
          } catch {
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

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(async () => (await caches.match('/')) || caches.match(OFFLINE_URL))
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached || new Response('Offline', { status: 503 }));
        return cached || network;
      })
    )
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(processQueuedRequests());
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data?.json() || {};
    } catch {
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
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matched = clients.find((client) => client.url.includes(self.location.origin));
      if (matched) return matched.focus();
      return self.clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
