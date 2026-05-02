'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import { useStore } from '@/store/useStore';
import ProductCard from '@/components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, TrendingUp, Star, Zap, ArrowUp, Leaf, ShieldCheck, Truck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const categories = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Snacks', 'Grocery'];
const sortOptions = [
  { value: '', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const keywordFromUrl = searchParams.get('keyword') || '';
  const categoryFromUrl = searchParams.get('category') || '';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || 'All');
  const [sortBy, setSortBy] = useState('');
  const [keyword, setKeyword] = useState(keywordFromUrl);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const { location, setLocation } = useStore();
  const [locating, setLocating] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (sortBy) params.sort = sortBy;
      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
      }
      const { data } = await api.get('/products', { params });
      setProducts(data.products || data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedCategory, sortBy, location]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setKeyword(keywordFromUrl);
  }, [keywordFromUrl]);

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetLocation = () => {
    if (location) {
      // If already locating, clicking again clears it
      setLocation(null);
      return;
    }
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocating(false);
        },
        (error) => {
          console.error(error);
          toast.error('Could not get location. Please enable location permissions.');
          setLocating(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
      setLocating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      {!keyword && selectedCategory === 'All' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-500 to-teal-600 text-white rounded-3xl p-8 sm:p-12 lg:p-16 my-4 shadow-2xl"
        >
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
          
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <Leaf size={14} /> Farm-Fresh Daily
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4"
            >
              Fresh Groceries,{' '}
              <span className="text-yellow-300">Delivered</span> to Your Door
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-green-100 text-lg mb-8 max-w-lg"
            >
              Shop from local sellers, compare prices, and get the freshest produce delivered right to your doorstep.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm">
                <Truck size={16} /> Free delivery on orders ₹50+
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm">
                <ShieldCheck size={16} /> 100% Quality Guarantee
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm">
                <Star size={16} /> 4.9★ Customer Rating
              </div>
            </motion.div>
          </div>

          {/* Floating decorative emoji badges */}
          <div className="hidden lg:block absolute right-16 top-8 text-6xl animate-float">🥑</div>
          <div className="hidden lg:block absolute right-40 bottom-8 text-5xl animate-float" style={{ animationDelay: '1s' }}>🍓</div>
          <div className="hidden lg:block absolute right-8 bottom-16 text-4xl animate-float" style={{ animationDelay: '2s' }}>🥕</div>
        </motion.section>
      )}

      {/* Filter & Sort Bar */}
      <div className="sticky top-16 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort & Results Info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <SlidersHorizontal size={16} />
              <span className="font-medium">{products.length} products</span>
              {keyword && (
                <span className="bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-lg text-xs font-medium">
                  &quot;{keyword}&quot;
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetLocation}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  location ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <MapPin size={16} className={location ? 'text-green-600' : 'text-gray-500'} />
                {locating ? 'Locating...' : location ? 'Stores near me' : 'Near Me'}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:outline-none cursor-pointer transition"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="h-44 shimmer" />
                <div className="p-4 space-y-3">
                  <div className="h-4 shimmer rounded w-3/4" />
                  <div className="h-3 shimmer rounded w-1/2" />
                  <div className="h-6 shimmer rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {products.map((product, index) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  layout
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
          >
            <Search size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No products found</h3>
            <p className="text-gray-400 dark:text-gray-500">
              {keyword ? `No results for "${keyword}". Try a different search term.` : 'No products available in this category yet.'}
            </p>
            {keyword && (
              <button
                onClick={() => { setKeyword(''); setSelectedCategory('All'); }}
                className="mt-6 px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition shadow-lg shadow-green-500/20"
              >
                Clear search
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 p-3 bg-green-600 text-white rounded-full shadow-xl hover:bg-green-700 transition-all z-50 hover:scale-110"
            title="Back to top"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <HomeContent />
    </Suspense>
  );
}
