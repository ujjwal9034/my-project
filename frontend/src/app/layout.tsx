import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToastProvider from '@/components/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FreshMarket - Local Grocery Delivery',
  description: 'A modern local grocery marketplace connecting you with nearby sellers. Fresh groceries delivered fast to your doorstep.',
  keywords: 'grocery, marketplace, fresh food, delivery, organic, local sellers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storage = localStorage.getItem('marketplace-storage');
                if (storage) {
                  const parsed = JSON.parse(storage);
                  if (parsed.state && parsed.state.darkMode) {
                    document.documentElement.classList.add('dark');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors duration-300`}>
        <ToastProvider />
        <Suspense fallback={<div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"></div>}>
          <Navbar />
        </Suspense>
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
