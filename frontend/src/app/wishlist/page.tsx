'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import ProductCard from '@/components/ProductCard';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function WishlistPage() {
  const { userInfo, setWishlist } = useStore();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) {
      router.push('/login');
      return;
    }
    fetchWishlist();
  }, [userInfo, router]);

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/wishlist');
      setProducts(data.products || []);
      setWishlist((data.products || []).map((p: any) => p._id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) return null;

  return (
    <div className="py-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-2xl">
          <Heart size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">My Wishlist</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Products you love, saved for later</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white dark:bg-gray-800 rounded-2xl h-72 animate-pulse border border-gray-100 dark:border-gray-700" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Heart size={56} className="mx-auto text-gray-200 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-400 dark:text-gray-500 mb-6">Browse products and tap the ❤️ to save items you love.</p>
          <Link href="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition">
            Explore Products
          </Link>
        </div>
      )}
    </div>
  );
}
