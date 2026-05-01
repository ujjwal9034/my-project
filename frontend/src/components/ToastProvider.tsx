'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '12px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          duration: 4000,
        },
      }}
    />
  );
}
