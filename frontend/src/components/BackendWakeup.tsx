'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

/**
 * BackendWakeup — Pings the backend on app load so Render wakes it up.
 * Since frontend is on Vercel (always awake), only the backend needs waking.
 * Shows a non-blocking toast-style notification instead of a full-screen blocker.
 */
export default function BackendWakeup() {
  const { backendReady, setBackendReady } = useStore();
  const [retryCount, setRetryCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (backendReady) return;

    let isMounted = true;
    let bannerTimeout: ReturnType<typeof setTimeout>;

    // Show banner after 2 seconds if still not ready (don't flash it for fast responses)
    bannerTimeout = setTimeout(() => {
      if (isMounted && !useStore.getState().backendReady) {
        setShowBanner(true);
      }
    }, 2000);

    const ping = async () => {
      try {
        const res = await fetch('/api/ping', {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok && isMounted) {
          setBackendReady(true);
          setShowBanner(false);
        } else {
          throw new Error('Not ready');
        }
      } catch (err) {
        if (isMounted) {
          setRetryCount(prev => prev + 1);
          // Retry every 3 seconds
          setTimeout(ping, 3000);
        }
      }
    };

    ping();
    return () => {
      isMounted = false;
      clearTimeout(bannerTimeout);
    };
  }, [backendReady, setBackendReady]);

  // Don't show anything if backend is ready or if we haven't waited long enough
  if (backendReady || !showBanner) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 max-w-md">
        {/* Spinner */}
        <div className="w-10 h-10 border-[3px] border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            Connecting to server...
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Free tier is waking up (~30-60s)
            {retryCount > 2 && (
              <span className="text-gray-400"> · attempt {retryCount}</span>
            )}
          </p>
          {/* Mini progress bar */}
          <div className="w-full bg-gray-100 dark:bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full animate-progress-bar" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
        @keyframes progress-bar {
          0% { width: 0%; }
          50% { width: 60%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
