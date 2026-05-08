'use client';

import { ReactNode } from 'react';

/**
 * ContentWrapper — Renders children immediately.
 * Since frontend is on Vercel (always on), no need to wait for backend.
 * The BackendWakeup component handles showing a non-blocking notification.
 */
export default function ContentWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
