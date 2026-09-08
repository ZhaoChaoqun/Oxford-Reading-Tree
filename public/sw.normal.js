// __ORT_SW_MODE__:normal
/**
 * sw.js 闁?Service Worker for Oxford Reading Tree PWA
 *
 * Cache strategy:
 *   App shell (HTML/JS/CSS/icons) 闁?cache-first, pre-cached on install
 *   Book resources (PDF/MP3)      闁?cache-first, auto-cached on first access
 *   Video resources (MP4)         闁?cache-first with Range request support
 *   Everything else               闁?network-first
 *
 * iOS Safari specifics handled:
 *   - Range requests for <audio>/<video> (206 Partial Content from cache)
 *   - Minimal install/activate work (Safari kills slow SWs)
 *   - LRU eviction when storage quota is exceeded
 *   - Message-based cache management from the app
 */

// 闁冲厜鍋撻柍鍏夊亾 Cache names 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾

const APP_CACHE_VERSION = 'v1';
const APP_CACHE  = `ort-app-${APP_CACHE_VERSION}`;
const BOOK_PREFIX  = 'ort-book-';   // per-book: ort-book-1-01
const VIDEO_PREFIX = 'ort-video-';  // per-video: ort-video-family-1-01
const DICT_CACHE   = 'ort-dictionary';
const META_DB      = 'ort-cache-meta'; // IndexedDB for LRU timestamps
const META_STORE   = 'access-times';

// Maximum total cache usage (advisory 闁?actual enforcement is best-effort)
const CACHE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

// 闁冲厜鍋撻柍鍏夊亾 App shell assets to pre-cache 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾
// These are filled in at build time or manually maintained.
// In production, Vite hashes filenames so we cache the index.html and
// let the browser resolve the hashed asset URLs on first load.

const APP_SCOPE_URL = new URL(self.registration.scope);
const APP_BASE_PATH = APP_SCOPE_URL.pathname.endsWith('/')
  ? APP_SCOPE_URL.pathname
  : APP_SCOPE_URL.pathname + '/';

const APP_SHELL_URLS = [
  APP_BASE_PATH,
  APP_BASE_PATH + 'index.html',
  APP_BASE_PATH + 'manifest.json',
  APP_BASE_PATH + 'icon-192.png',
  APP_BASE_PATH + 'icon-512.png',
  APP_BASE_PATH + 'apple-touch-icon.png',
  APP_BASE_PATH + 'probe.txt',
];

// 闁冲厜鍋撻柍鍏夊亾 Install: pre-cache app shell 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// 闁冲厜鍋撻柍鍏夊亾 Activate: clean old app-cache versions 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ort-app-') && k !== APP_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 闁冲厜鍋撻柍鍏夊亾 Fetch: strategy router 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests 闁?let POSTs etc. pass through
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // App shell: same-origin non-NAS requests (HTML, JS, CSS, icons)
  if (url.origin === self.location.origin) {
    event.respondWith(appShellStrategy(request));
    return;
  }

  // NAS resources: cross-origin PDF/MP3/MP4 requests
  const ext = url.pathname.split('.').pop()?.toLowerCase();

  if (ext === 'pdf' || ext === 'mp3') {
    event.respondWith(bookResourceStrategy(request, url));
    return;
  }

  if (ext === 'mp4') {
    event.respondWith(videoResourceStrategy(request, url));
    return;
  }

  // Dictionary PDF
  if (url.pathname.includes('dictionary')) {
    event.respondWith(dictionaryStrategy(request));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request));
});

// 闁冲厜鍋撻柍鍏夊亾 App shell: cache-first 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?
async function appShellStrategy(request) {
  const url = new URL(request.url);

  // Navigation requests (index.html, SPA routes): network-first.
  // This ensures a fresh deploy is visible immediately without clearing caches.
  const isNavigation =
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  if (isNavigation) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(APP_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      // Offline — serve cached index.html as SPA fallback
      const fallback =
        (await caches.match(request)) ??
        (await caches.match(APP_BASE_PATH + 'index.html'));
      if (fallback) return fallback;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  }

  // Hashed static assets (JS/CSS bundles): cache-first.
  // Vite content-hashes mean same URL = same bytes, so cache is always safe.
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// 闁冲厜鍋撻柍鍏夊亾 Book resources (PDF/MP3): cache-first, auto-cache on first access 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾

async function bookResourceStrategy(request, url) {
  const bookId = extractBookId(url);
  const cacheName = bookId ? `${BOOK_PREFIX}${bookId}` : APP_CACHE;

  // Check cache first
  const cached = await caches.match(request);
  if (cached) {
    // Handle Range requests from cache (Safari sends these for audio)
    if (request.headers.has('Range')) {
      return handleRangeFromCache(cached, request);
    }
    touchCache(cacheName);
    return cached;
  }

  // Not cached 闁?fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      await storeWithQuotaCheck(cacheName, request, response.clone());
    }
    return response;
  } catch {
    return new Response('Resource unavailable offline', {
      status: 503,
      statusText: 'Offline',
    });
  }
}

// 闁冲厜鍋撻柍鍏夊亾 Video resources (MP4): cache-first with Range support 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾
// iOS Safari ALWAYS sends Range requests for <video>.
// If we have the full response cached, we slice it to honor the Range header.
// If not cached, we pass through to network (videos are large 闁?not auto-cached).

async function videoResourceStrategy(request, url) {
  const videoId = extractVideoId(url);
  const cacheName = videoId ? `${VIDEO_PREFIX}${videoId}` : APP_CACHE;

  // Check cache (ignoring query params which iOS may append)
  const cached = await caches.match(request, { ignoreSearch: true });

  if (cached) {
    if (request.headers.has('Range')) {
      return handleRangeFromCache(cached, request);
    }
    touchCache(cacheName);
    return cached;
  }

  // Not cached 闁?pass through to network
  // Videos are large (30MB+), so we only cache them via explicit PRECACHE_VIDEO message
  return fetch(request);
}

// 闁冲厜鍋撻柍鍏夊亾 Dictionary: cache-first 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾

async function dictionaryStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    if (request.headers.has('Range')) {
      return handleRangeFromCache(cached, request);
    }
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DICT_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Dictionary unavailable offline', {
      status: 503,
      statusText: 'Offline',
    });
  }
}

// 闁冲厜鍋撻柍鍏夊亾 Network-first fallback 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// 闁冲厜鍋撻柍鍏夊亾 Range request handling 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?// iOS Safari sends Range headers for <audio> and <video>.
// The Cache API stores full responses. We slice the body to produce a
// proper 206 Partial Content response.

async function handleRangeFromCache(cachedResponse, request) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) return cachedResponse;

  try {
    const fullBody = await cachedResponse.clone().arrayBuffer();
    const totalSize = fullBody.byteLength;

    // Parse "bytes=START-END" (END is optional)
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) return cachedResponse;

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

    // Validate range
    if (start >= totalSize) {
      return new Response(null, {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    const clampedEnd = Math.min(end, totalSize - 1);
    const sliced = fullBody.slice(start, clampedEnd + 1);

    return new Response(sliced, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${clampedEnd}/${totalSize}`,
        'Content-Length': String(sliced.byteLength),
        'Content-Type': cachedResponse.headers.get('Content-Type') || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err) {
    // Slicing failed (e.g., memory issue with very large files) 闁?fall through
    console.warn('[sw] Range slice failed, returning full response:', err.message);
    return cachedResponse;
  }
}

// 闁冲厜鍋撻柍鍏夊亾 ID extraction from NAS URLs 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾
// URL pattern: .../books/stage-1/1-01-at-school.pdf 闁?"1-01"
// URL pattern: .../videos/family-stage-1/family-1-01-xxx.mp4 闁?"family-1-01"

function extractBookId(url) {
  const match = url.pathname.match(/\/(\d+-\d+)/);
  return match ? match[1] : null;
}

function extractVideoId(url) {
  const match = url.pathname.match(/(family-\d+-\d+)/);
  return match ? match[1] : null;
}

// 闁冲厜鍋撻柍鍏夊亾 Quota-aware caching 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾

async function storeWithQuotaCheck(cacheName, request, response) {
  // Check quota before caching
  if (await isQuotaExceeded()) {
    await evictLRU();
  }

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    touchCache(cacheName);
  } catch (err) {
    // Quota exceeded despite eviction 闁?silently skip caching
    console.warn('[sw] Cache put failed (quota?):', err.message);
  }
}

async function isQuotaExceeded() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const { usage } = await navigator.storage.estimate();
      return usage > CACHE_QUOTA_BYTES;
    } catch {
      // estimate() not available in SW context on some browsers
    }
  }
  // Heuristic fallback: if we have more than 40 book/video caches, start evicting
  const keys = await caches.keys();
  const resourceCaches = keys.filter(
    (k) => k.startsWith(BOOK_PREFIX) || k.startsWith(VIDEO_PREFIX)
  );
  return resourceCaches.length > 40;
}

async function evictLRU() {
  try {
    const times = await getAllAccessTimes();
    if (times.length === 0) return;

    // Sort by access time ascending (oldest first)
    times.sort((a, b) => a.time - b.time);

    // Evict the oldest cache
    const oldest = times[0];
    await caches.delete(oldest.name);
    await removeAccessTime(oldest.name);
    console.log('[sw] Evicted cache:', oldest.name);
  } catch {
    // LRU eviction is best-effort
  }
}

// 闁冲厜鍋撻柍鍏夊亾 LRU metadata (IndexedDB for access timestamps) 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾
// We use IndexedDB directly (not the idb library, which isn't available in SW)

function openMetaDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(META_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function touchCache(cacheName) {
  try {
    const db = await openMetaDb();
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(Date.now(), cacheName);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    db.close();
  } catch {
    // Non-critical 闁?just means LRU won't have this entry
  }
}

async function getAllAccessTimes() {
  try {
    const db = await openMetaDb();
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);

    return new Promise((resolve, reject) => {
      const results = [];
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          results.push({ name: c.key, time: c.value });
          c.continue();
        } else {
          db.close();
          resolve(results);
        }
      };
      cursor.onerror = () => {
        db.close();
        reject(cursor.error);
      };
    });
  } catch {
    return [];
  }
}

async function removeAccessTime(cacheName) {
  try {
    const db = await openMetaDb();
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).delete(cacheName);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    db.close();
  } catch {
    // Non-critical
  }
}

// 闁冲厜鍋撻柍鍏夊亾 Message handler: cache management from the app 闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋撻柍鍏夊亾闁冲厜鍋?
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    // Pre-cache a specific book (called when entering Reader)
    case 'PRECACHE_BOOK': {
      const { bookId, urls } = payload;
      const cacheName = `${BOOK_PREFIX}${bookId}`;
      caches.open(cacheName).then((cache) =>
        Promise.allSettled(
          urls.map((u) => cache.add(u).catch(() => {}))
        )
      ).then(() => {
        touchCache(cacheName);
        notifyClient(event.source, { type: 'PRECACHE_DONE', payload: { bookId } });
      });
      break;
    }

    // Pre-cache a specific video (user taps "Download" on VideoPage)
    case 'PRECACHE_VIDEO': {
      const { videoId, url } = payload;
      const cacheName = `${VIDEO_PREFIX}${videoId}`;
      caches.open(cacheName).then((cache) =>
        cache.add(url).catch(() => {})
      ).then(() => {
        touchCache(cacheName);
        notifyClient(event.source, { type: 'PRECACHE_DONE', payload: { videoId } });
      });
      break;
    }

    // Delete a specific cache (from Settings > Cache Manager)
    case 'DELETE_CACHE': {
      const { cacheName } = payload;
      caches.delete(cacheName).then(() => removeAccessTime(cacheName));
      break;
    }

    // Return cache inventory for the Cache Manager UI
    case 'GET_CACHE_STATUS': {
      getCacheStatus().then((status) => {
        notifyClient(event.source, { type: 'CACHE_STATUS', payload: status });
      });
      break;
    }

    // Force SW update (after a new deploy)
    case 'SKIP_WAITING': {
      self.skipWaiting();
      break;
    }
  }
});

async function getCacheStatus() {
  const keys = await caches.keys();
  const entries = [];

  for (const name of keys) {
    if (!name.startsWith('ort-')) continue;

    const cache = await caches.open(name);
    const requests = await cache.keys();

    // Estimate size: sum Content-Length headers
    let totalBytes = 0;
    for (const req of requests) {
      const res = await cache.match(req);
      const cl = res?.headers.get('Content-Length');
      if (cl) totalBytes += parseInt(cl, 10);
    }

    entries.push({
      name,
      count: requests.length,
      estimatedBytes: totalBytes,
    });
  }

  return { caches: entries, totalCaches: entries.length };
}

function notifyClient(client, message) {
  try {
    client?.postMessage(message);
  } catch {
    // Client may have navigated away
  }
}
