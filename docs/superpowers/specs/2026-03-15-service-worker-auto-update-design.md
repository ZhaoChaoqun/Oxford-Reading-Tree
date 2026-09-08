# Service Worker Auto-Update Fix — Design Spec
Date: 2026-03-15

## Problem

After `npm build` + NAS deploy, Safari serves the old app until the user manually clears browser data.

## Root Cause

`sw.js` (in `public/`) contains `APP_CACHE_VERSION = 'v1'` hardcoded. Since `sw.js` is in `public/`, Vite copies it to `dist/` unchanged on every build. The file bytes never change → browser sees the same SW hash → never installs a new SW → old `ort-app-v1` cache persists → old `index.html` and old JS bundles are served forever.

Secondary issue: `appShellStrategy` is cache-first for ALL same-origin requests, including `index.html`. Even if the SW were updated, the old cached `index.html` would be served on the first request before the new SW has a chance to act.

---

## Fix — Two Changes

### Fix 1: Inject build timestamp into sw.js at build time (Vite plugin)

Add a Vite plugin in `vite.config.js` that replaces the placeholder `APP_CACHE_VERSION = 'v1'` in `sw.js` with a version string containing the build timestamp:

```js
// vite.config.js
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    writeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      const ts = Date.now();
      let content = fs.readFileSync(swPath, 'utf8');
      content = content.replace(
        /APP_CACHE_VERSION\s*=\s*['"][^'"]*['"]/,
        `APP_CACHE_VERSION = 'v${ts}'`
      );
      fs.writeFileSync(swPath, content);
    }
  };
}
```

Effect: every `npm build` produces a `sw.js` with a unique version string → browser detects bytes changed → installs new SW → activate handler deletes old `ort-app-v1-<old>` cache → fresh assets fetched.

The same plugin must also patch `sw.normal.js` in `dist/` (which is a copy of `sw.js`).

### Fix 2: Network-first for HTML navigation in `appShellStrategy`

Split `appShellStrategy` into two strategies:

**Navigation requests** (`request.mode === 'navigate'` or URL ends with `/` or `.html`): **network-first**
- Try network → cache on success
- Fallback to cached `index.html` when offline

**Hashed static assets** (URL matches `/assets/` path with Vite hash): **cache-first**
- Check cache → serve immediately
- Fetch + cache on miss

This means even without an SW update cycle, opening the app while online always fetches the latest `index.html`, which references the latest hashed JS/CSS bundles.

```js
async function appShellStrategy(request) {
  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html');

  if (isNavigation) {
    // Network-first: always try to get fresh index.html
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(APP_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const fallback = await caches.match(APP_BASE_PATH + 'index.html');
      return fallback || new Response('Offline', { status: 503 });
    }
  }

  // Hashed assets: cache-first
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
    return new Response('Offline', { status: 503 });
  }
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `vite.config.js` | Add `injectSwVersion()` Vite plugin; import `fs` and `resolve` |
| `public/sw.js` | Change `appShellStrategy` to network-first for navigation |
| `public/sw.normal.js` | Same change as `sw.js` (both files are kept in sync) |

---

## What This Does NOT Change

- Book/video/dictionary cache strategies unchanged (still cache-first — correct for large NAS resources)
- localStorage and IndexedDB data untouched
- SW registration code in `main.jsx` unchanged
- No need to manually clear Safari data after deploy

---

## Testing

After fix, expected behaviour:
1. `npm build` → `dist/sw.js` contains new timestamp version
2. Deploy to NAS → browser downloads new `sw.js` (bytes changed)
3. New SW installs, activates, deletes old app cache
4. Next page load: network-first fetches fresh `index.html` → loads new JS bundles
5. Subsequent loads: cache-first for JS/CSS (fast) + fresh HTML always
