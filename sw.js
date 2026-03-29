// ============================================================
// DIGITALE SOLUTION — Service Worker
// Gestion offline, cache, sync arrière-plan
// ============================================================

const CACHE_NAME    = 'ds-pos-v3';
const OFFLINE_PAGE  = '/';

// Ressources à mettre en cache immédiatement à l'installation
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Fonts Google (optionnel — mise en cache à la première visite)
];

// Ressources externes à mettre en cache au premier accès
const CACHE_CDN_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Précache partiel:', err))
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Suppression ancien cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Stratégie hybride ─────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes non-GET ni les appels API
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('firestore.googleapis.com')) return;
  if (url.hostname.includes('firebase.googleapis.com')) return;

  // CDN externes (fonts, scripts) : Cache First
  if (CACHE_CDN_PATTERNS.some(p => url.hostname.includes(p))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages app : Network First avec fallback cache
  event.respondWith(networkFirst(request));
});

// Stratégie Cache First (CDN, assets statiques)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Ressource non disponible', { status: 503 });
  }
}

// Stratégie Network First (pages app)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_PAGE);
  }
}

// ── BACKGROUND SYNC ──────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'ds-sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // Récupérer la file depuis le client
  const clients = await self.clients.matchAll();
  if (!clients.length) return;

  for (const client of clients) {
    const channel = new MessageChannel();
    const queuePromise = new Promise(resolve => {
      channel.port1.onmessage = e => resolve(e.data.queue || []);
    });
    client.postMessage({ type: 'GET_QUEUE' }, [channel.port2]);

    const queue = await Promise.race([
      queuePromise,
      new Promise(r => setTimeout(() => r([]), 3000))
    ]);

    if (!queue.length) continue;

    const synced = [];
    let pending = 0;

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method:  item.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(item.body)
        });
        if (res.ok) {
          synced.push(item.id);
        } else {
          pending++;
        }
      } catch {
        pending++;
      }
    }

    // Notifier le client des items synchronisés
    client.postMessage({ type: 'SYNC_COMPLETE', synced: synced.length, pending });
    if (synced.length > 0) {
      client.postMessage({ type: 'REMOVE_SYNCED', ids: synced });
    }
  }
}

// ── MESSAGES depuis l'app ────────────────────────────────────
self.addEventListener('message', event => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'SAVE_QUEUE':
      // Mémoriser la queue pour la sync background
      // (déjà géré côté app via localStorage)
      break;

    case 'GET_QUEUE_SIZE':
      // Répondre avec la taille de la queue (estimée)
      event.source?.postMessage({ type: 'QUEUE_SIZE', size: 0 });
      break;

    case 'TRIGGER_SYNC':
      self.registration.sync?.register('ds-sync-queue').catch(() => {});
      break;
  }
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: event.data.text() }; }

  const title   = payload.title || 'Digitale Solution';
  const options = {
    body:    payload.body    || '',
    icon:    payload.icon    || '/icon-192.png',
    badge:   '/icon-192.png',
    tag:     payload.tag     || 'ds-notif',
    data:    payload.data    || {},
    vibrate: [200, 100, 200],
    actions: payload.actions || []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow('/');
      })
  );
});
