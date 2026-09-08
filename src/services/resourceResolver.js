export function createResourceResolver({
  primaryUrl, fallbackUrl, localBaseUrl = '', timeout = 3000,
  getCached, setCached, fetchImpl = globalThis.fetch, now = Date.now,
  isOffline = () => globalThis.navigator?.onLine === false,
}) {
  const staleAfter = 5 * 60 * 1000;
  let resolvedBaseUrl = null;
  let resolvedAt = 0;
  let inFlight = null;

  async function probe(baseUrl, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/probe.txt`, {
        method: 'HEAD', signal: controller.signal, mode: 'cors', cache: 'no-store',
      });
      return response.ok;
    } catch (error) {
      if (error.name !== 'AbortError' && !(error instanceof TypeError)) throw error;
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async function resolve() {
    if (localBaseUrl) {
      // Let the service worker serve previously downloaded media when offline.
      if (isOffline()) return localBaseUrl;
      if (!await probe(localBaseUrl, timeout)) {
        throw new Error('Cannot reach the local library. Retry or ask the administrator to check the media service and OXFORD_MEDIA_DIR.');
      }
      resolvedBaseUrl = localBaseUrl;
      resolvedAt = now();
      return localBaseUrl;
    }

    const endpoints = [...new Set([primaryUrl, fallbackUrl])];
    for (const [index, url] of endpoints.entries()) {
      if (await probe(url, timeout * (index + 1))) {
        resolvedBaseUrl = url;
        resolvedAt = now();
        setCached(url);
        return url;
      }
    }

    const cached = getCached();
    if (cached) {
      resolvedBaseUrl = cached;
      resolvedAt = now() - staleAfter + 30_000;
      console.warn('[resourceProbe] NAS unreachable - using cached URL:', cached);
      return cached;
    }
    throw new Error('Cannot reach NAS. Check the network and NAS, or configure OXFORD_MEDIA_DIR for local media.');
  }

  function resolveBaseUrl(force = false) {
    if (inFlight) return inFlight;
    if (!force && resolvedBaseUrl && now() - resolvedAt < staleAfter) {
      return Promise.resolve(resolvedBaseUrl);
    }
    // Keep the cleanup on the returned promise so a failed probe cannot create
    // a second, unhandled rejection from an ignored finally() promise.
    inFlight = resolve().finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    resolveBaseUrl,
    getCachedBaseUrl: () => resolvedBaseUrl ?? (localBaseUrl ? (isOffline() ? localBaseUrl : null) : getCached()) ?? null,
    isStale: () => now() - resolvedAt >= staleAfter,
  };
}
