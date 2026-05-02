'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-[120px] font-extrabold text-gray-100 dark:text-gray-800 leading-none select-none">404</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white -mt-4 mb-3">Page Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 dark:shadow-green-900/30"
          >
            <Home size={18} />
            Go Home
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <ShoppingBag size={18} />
            View Cart
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
