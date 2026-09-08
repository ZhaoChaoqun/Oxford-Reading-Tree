import config from '../data/config.json';
import { kv, STORAGE_KEYS } from './storageService';
import { createResourceResolver } from './resourceResolver';

const resolver = createResourceResolver({
  primaryUrl: config.storage.primaryBaseURL,
  fallbackUrl: config.storage.fallbackBaseURL,
  localBaseUrl: import.meta.env.VITE_LOCAL_MEDIA_BASE_URL,
  timeout: config.storage.probeTimeout ?? 3000,
  getCached: () => kv.get(STORAGE_KEYS.BASE_URL),
  setCached: (url) => kv.set(STORAGE_KEYS.BASE_URL, url),
});

export const { resolveBaseUrl, getCachedBaseUrl, isStale } = resolver;
