# Service Worker Auto-Update Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Safari needing manual data-clear after each deploy by (a) injecting a build timestamp into `sw.js` so the browser always installs the new SW, and (b) making `index.html` requests network-first so fresh app HTML is always served when online.

**Architecture:** A Vite `writeBundle` plugin replaces the hardcoded `APP_CACHE_VERSION = 'v1'` in the output `dist/sw.js` (and `dist/sw.normal.js`) with a timestamp version on every build. In parallel, `appShellStrategy` inside both SW files is split into network-first (HTML navigation) and cache-first (hashed assets), so a fresh deploy is visible without even waiting for the SW update cycle.

**Tech Stack:** Vite 5, vanilla JS Service Worker, Node.js `fs` (in Vite plugin)

**Spec:** `docs/superpowers/specs/2026-03-15-service-worker-auto-update-design.md`

---

## Chunk 1: Vite plugin — inject build timestamp into sw.js

### Task 1: Add `injectSwVersion` Vite plugin to `vite.config.js`

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Read current `vite.config.js`** to understand existing imports and plugin list.

- [ ] **Step 2: Add `fs` import and `injectSwVersion` plugin**

Open `vite.config.js` and make these changes:

```js
// At top of file — add fs import
import fs from 'node:fs';

// After the existing __dirname setup, add this plugin factory:
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    // Runs after all files are written to dist/
    closeBundle() {
      const ts = Date.now();
      const swFiles = [
        resolve(__dirname, 'dist/sw.js'),
        resolve(__dirname, 'dist/sw.normal.js'),
      ];
      for (const swPath of swFiles) {
        if (!fs.existsSync(swPath)) continue;
        let content = fs.readFileSync(swPath, 'utf8');
        const updated = content.replace(
          /APP_CACHE_VERSION\s*=\s*['"][^'"]*['"]/,
          `APP_CACHE_VERSION = 'v${ts}'`
        );
        if (updated === content) {
          console.warn(`[injectSwVersion] Pattern not found in ${swPath} — version not injected`);
        } else {
          fs.writeFileSync(swPath, updated);
          console.log(`[injectSwVersion] Injected version v${ts} into ${swPath}`);
        }
      }
    },
  };
}
```

- [ ] **Step 3: Add the plugin to the `plugins` array**

```js
plugins: [react(), injectSwVersion()],
```

- [ ] **Step 4: Verify by running build and inspecting output**

```bash
cd E:\OxfordTree\oxford-tree-pwa
npm run build 2>&1 | tail -20
```

Expected output contains: `[injectSwVersion] Injected version v<timestamp> into ...dist/sw.js`

Then verify:
```bash
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\dist\sw.js' -Pattern 'APP_CACHE_VERSION'"
```

Expected: `APP_CACHE_VERSION = 'v1<13-digit-timestamp>'` (NOT just `'v1'`)

- [ ] **Step 5: Commit**

```bash
cd E:\OxfordTree\oxford-tree-pwa
git add vite.config.js
git commit -m "build: inject build timestamp into sw.js APP_CACHE_VERSION on every build"
```

---

## Chunk 2: Network-first for HTML navigation in sw.js and sw.normal.js

### Task 2: Update `appShellStrategy` in `public/sw.js`

**Files:**
- Modify: `public/sw.js` (lines ~114–133, the `appShellStrategy` function)

- [ ] **Step 1: Replace `appShellStrategy` with the split navigation/assets version**

Find and replace the entire `appShellStrategy` function:

```js
// ── App shell: network-first for HTML, cache-first for hashed assets ─────────
async function appShellStrategy(request) {
  const url = new URL(request.url);

  // Navigation requests (index.html, SPA routes): network-first
  // This ensures a fresh deploy is visible without manual cache clear.
  const isNavigation =
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  if (isNavigation) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Update the cached copy so offline fallback is also fresh
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

  // Hashed static assets (JS/CSS bundles): cache-first
  // Vite content-hashes mean same URL = same bytes forever, so cache is safe.
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
    if (request.mode === 'navigate') {
      const fallback = await caches.match(APP_BASE_PATH + 'index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
```

- [ ] **Step 2: Verify `public/sw.js` has exactly one `appShellStrategy` function**

```bash
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\public\sw.js' -Pattern 'async function appShellStrategy'"
```

Expected: exactly 1 match

### Task 3: Apply the same change to `public/sw.normal.js`

**Files:**
- Modify: `public/sw.normal.js`

- [ ] **Step 1: Apply the identical `appShellStrategy` replacement to `sw.normal.js`**

`sw.normal.js` is a copy of `sw.js`. Apply the exact same function replacement as in Task 2.

- [ ] **Step 2: Verify**

```bash
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\public\sw.normal.js' -Pattern 'isNavigation'"
```

Expected: match found

- [ ] **Step 3: Build and verify both output files are updated**

```bash
npm run build 2>&1 | tail -5
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\dist\sw.js' -Pattern 'isNavigation'"
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\dist\sw.normal.js' -Pattern 'isNavigation'"
```

Expected: both files contain `isNavigation`

- [ ] **Step 4: Commit**

```bash
cd E:\OxfordTree\oxford-tree-pwa
git add public/sw.js public/sw.normal.js
git commit -m "fix: sw network-first for HTML navigation — eliminates need to manually clear Safari data after deploy"
```

---

## Verification Checklist

After both chunks are complete:

- [ ] `npm run build` succeeds with no errors
- [ ] `dist/sw.js` contains `APP_CACHE_VERSION = 'v1<timestamp>'` (not `'v1'`)
- [ ] `dist/sw.normal.js` contains the same timestamp
- [ ] `dist/sw.js` contains `isNavigation` in `appShellStrategy`
- [ ] Running build twice produces different timestamps each time:

```bash
npm run build 2>&1 | grep "Injected version"
# note timestamp
npm run build 2>&1 | grep "Injected version"
# should be different timestamp
```
