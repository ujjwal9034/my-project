'use client';

import { useEffect } from 'react';

/**
 * BackendWakeup — Silently pings the backend on app load so Render
 * wakes it up before the user tries to do anything.
 * No UI rendered — purely a background effect.
 */
export default function BackendWakeup() {
  useEffect(() => {
    const ping = async () => {
      try {
        // /api/health is proxied to the backend via Next.js rewrites
        await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      } catch {
        // Backend is sleeping — retry after 4 seconds
        setTimeout(ping, 4000);
      }
    };
    ping();
  }, []);

  return null;
}
