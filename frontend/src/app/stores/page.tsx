'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Store, MapPin, Truck, Package, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data } = await api.get('/users/stores');
        setStores(data);
      } catch (error) {
        console.error('Failed to fetch stores', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const filteredStores = stores.filter(store => 
    (store.storeName || store.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-3">
          <Store className="text-green-600" size={40} />
          FreshMart Stores
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Discover local sellers, organic farms, and premium grocery stores in your area.
        </p>

        <div className="relative max-w-xl mx-auto mt-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a store..."
            className="w-full px-6 py-4 pl-14 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition text-gray-900 dark:text-white"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white dark:bg-gray-800 rounded-2xl p-6 h-48 border border-gray-100 dark:border-gray-700 shimmer" />
          ))}
        </div>
      ) : filteredStores.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
          {filteredStores.map((store, i) => (
            <motion.div
              key={store._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all group flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0">
                  {store.avatar ? (
                    <img src={store.avatar} alt={store.storeName} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    (store.storeName || store.name).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors flex items-center gap-1.5">
                    {store.storeName || store.name}
                    {store.isApproved && (
                      <span title="Verified Seller" className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-0.5 rounded-full">
                        <ShieldCheck size={14} className="fill-current" />
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <MapPin size={14} />
                    {store.address ? store.address.substring(0, 30) + (store.address.length > 30 ? '...' : '') : 'Local Area'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                {store.deliveryAvailable && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    <Truck size={12} /> Delivery
                  </span>
                )}
                {store.pickupAvailable && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                    <Package size={12} /> Pickup
                  </span>
                )}
              </div>

              <Link
                href={`/?keyword=${encodeURIComponent(store.storeName || store.name)}`}
                className="w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-center font-semibold hover:bg-green-600 hover:text-white transition-colors border border-gray-100 dark:border-gray-700 group-hover:border-transparent"
              >
                View Products
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
          <Store size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No stores found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  );
}
