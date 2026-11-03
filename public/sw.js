/* Bump this version when publishing a new app shell. */
const CACHE_NAME = 'cbt-v1';
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

function strategyFor(request, workerURL) {
  const base = new URL('./', workerURL);
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('range') || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  const path = url.pathname.slice(base.pathname.length);
  if (/\.pdf$/i.test(path)) return null;
  if (request.mode === 'navigate' || path === 'index.html') return 'document';
  if (path.startsWith('data/') && path.endsWith('.json')) return 'network-first';
  if (/^assets\/.+-[\w-]{8,}\.[\w.]+$/.test(path) || path.startsWith('fonts/') || /\.(png|svg|jpg|webp)$/i.test(path)) return 'cache-first';
  return null;
}

function oldCacheNames(names) {
  return names.filter(name => name.startsWith('cbt-') && name !== CACHE_NAME);
}

async function storeResponse(cache, request, response) {
  if (response.ok && response.type === 'basic') {
    // Storage pressure must not turn a successful network response into an error.
    try { await cache.put(request, response.clone()); } catch { /* best effort */ }
  }
  return response;
}

async function respond(request, strategy) {
  const cache = await caches.open(CACHE_NAME);
  if (strategy === 'cache-first') {
    const saved = await cache.match(request);
    if (saved) return saved;
  }
  try {
    return await storeResponse(cache, request, await fetch(request));
  } catch (error) {
    const saved = await cache.match(request);
    if (saved) return saved;
    if (strategy === 'document') {
      const shell = await cache.match(new URL('index.html', self.location.href).href);
      if (shell) return shell;
    }
    throw error;
  }
}

// No skipWaiting or clients.claim: updates never replace an active exam.
if (typeof self !== 'undefined' && typeof self.skipWaiting === 'function') {
  self.addEventListener('install', event => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(PRECACHE.map(async path => {
        const request = new Request(new URL(path, self.location.href), { cache: 'reload' });
        const response = await fetch(request);
        if (!response.ok || response.type !== 'basic') throw new Error('App shell unavailable');
        await cache.put(request, response);
      }));
    })());
  });
  self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(names => Promise.all(oldCacheNames(names).map(name => caches.delete(name)))));
  });
  self.addEventListener('fetch', event => {
    const strategy = strategyFor(event.request, self.location.href);
    if (strategy) event.respondWith(respond(event.request, strategy));
  });
}
