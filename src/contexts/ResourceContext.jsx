/**
 * ResourceContext.jsx
 *
 * Wraps resourceProbe in React state so every component can read the
 * resolved NAS base URL without triggering its own probe.
 *
 * Re-probes automatically when:
 *   - The app returns to the foreground (visibilitychange) and the cached URL is stale
 *   - The device comes back online (online event)
 *
 * API:
 *   const { baseUrl, isProbing, error, reprobeNow } = useResource();
 *   const url = useResourceUrl('books/stage-1/1-01.pdf');
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import { resolveBaseUrl, getCachedBaseUrl, isStale } from '../services/resourceProbe';

export const ResourceContext = createContext(null);

export function ResourceProvider({ children }) {
  // Seed with last session's URL so components do not see null on first render.
  const [baseUrl, setBaseUrl] = useState(getCachedBaseUrl);
  const [isProbing, setIsProbing] = useState(true);
  const [error, setError] = useState(null);

  // Prevent setting state after unmount.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runProbe = useCallback(async (force = false) => {
    if (!mountedRef.current) return;
    setIsProbing(true);
    setError(null);

    try {
      const url = await resolveBaseUrl(force);
      if (mountedRef.current) {
        setBaseUrl(url);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        // Keep the last known baseUrl so cached content still works offline.
      }
    } finally {
      if (mountedRef.current) {
        setIsProbing(false);
      }
    }
  }, []);

  // Initial probe on mount.
  useEffect(() => {
    runProbe(false);
  }, [runProbe]);

  // Re-probe when the app returns to the foreground.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isStale()) {
        runProbe(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [runProbe]);

  // Re-probe when the device comes back online.
  useEffect(() => {
    const handleOnline = () => runProbe(true);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [runProbe]);

  const reprobeNow = useCallback(() => runProbe(true), [runProbe]);

  return (
    <ResourceContext.Provider value={{ baseUrl, isProbing, error, reprobeNow }}>
      {children}
    </ResourceContext.Provider>
  );
}

/**
 * Returns the resolved NAS base URL and probe state.
 * baseUrl is null while the initial probe is in flight and no cached URL exists.
 */
export function useResource() {
  const ctx = useContext(ResourceContext);
  if (!ctx) throw new Error('useResource must be used within ResourceProvider');
  return ctx;
}

/**
 * Builds a full NAS resource URL from a relative path.
 * Returns null if baseUrl is not yet resolved.
 *
 * @example
 *   const pdfUrl = useResourceUrl('books/stage-1/1-01-at-school.pdf');
 *   // 'http://192.168.1.x:8080/reading-tree/books/stage-1/1-01-at-school.pdf'
 */
export function useResourceUrl(relativePath) {
  const { baseUrl } = useResource();
  if (!baseUrl || !relativePath) return null;
  return `${baseUrl.replace(/\/$/, '')}/${relativePath.replace(/^\//, '')}`;
}