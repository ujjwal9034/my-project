import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToastProvider from '@/components/ToastProvider';
import WarningBanner from '@/components/WarningBanner';
import BackendWakeup from '@/components/BackendWakeup';
import ContentWrapper from '@/components/ContentWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FreshMarket - Local Grocery Delivery',
  description: 'A modern local grocery marketplace connecting you with nearby sellers. Fresh groceries delivered fast to your doorstep.',
  keywords: 'grocery, marketplace, fresh food, delivery, organic, local sellers',
  manifest: '/manifest.json',
  themeColor: '#16a34a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FreshMart',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storage = localStorage.getItem('marketplace-storage');
                if (storage) {
                  const parsed = JSON.parse(storage);
                  if (parsed.state && parsed.state.darkMode) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                document.documentElement.classList.remove('dark');
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors duration-300 text-gray-900 dark:text-gray-100`}>
        <BackendWakeup />
        <ToastProvider />
        <ContentWrapper>
          <Suspense fallback={<div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"></div>}>
            <WarningBanner />
            <Navbar />
          </Suspense>
          <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </ContentWrapper>
      </body>
    </html>
  );
}
