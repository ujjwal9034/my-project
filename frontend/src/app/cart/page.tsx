'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { getImageUrl } from '@/utils/api';
import { Trash2, ShoppingCart as CartIcon, Minus, Plus, ArrowLeft, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Cart() {
  const { cart, removeFromCart, addToCart } = useStore();

  const handleQtyChange = (item: any, qty: number) => {
    if (qty > 0) {
      addToCart({ ...item, qty });
    } else {
      removeFromCart(item.product);
      toast.success(`${item.name} removed from cart`);
    }
  };

  const handleRemove = (item: any) => {
    removeFromCart(item.product);
    toast.success(`${item.name} removed from cart`);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = totalPrice > 50 ? 0 : 5;

  return (
    <div className="py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Shopping Cart</h1>
        {cart.length > 0 && (
          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-bold">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {cart.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white dark:bg-gray-800 p-12 text-center rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <CartIcon size={64} className="mx-auto text-gray-200 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven&apos;t added any items to the cart yet.</p>
          <Link href="/" className="inline-block bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 dark:shadow-green-900/30">
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-2/3 space-y-3">
            <AnimatePresence>
              {cart.map((item, index) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  key={item.product}
                  className="flex items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="w-20 h-20 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/100x100/e2e8f0/64748b?text=${encodeURIComponent(item.name)}`;
                      }}
                    />
                  </div>
                  <div className="flex-grow px-4 min-w-0">
                    <Link href={`/product/${item.product}`}>
                      <h3 className="text-base font-bold text-gray-800 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition truncate">{item.name}</h3>
                    </Link>
                    <p className="text-green-600 dark:text-green-400 font-extrabold mt-1">₹{item.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Subtotal: ${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleQtyChange(item, item.qty - 1)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-4 text-sm font-bold text-gray-800 dark:text-white min-w-[2rem] text-center bg-white dark:bg-gray-800">{item.qty}</span>
                      <button
                        onClick={() => handleQtyChange(item, item.qty + 1)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="w-full lg:w-1/3">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h3>
              <div className="space-y-3 text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={`font-semibold ${shippingPrice === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {shippingPrice === 0 ? 'Free' : `₹${shippingPrice.toFixed(2)}`}
                  </span>
                </div>
                {shippingPrice > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                    💡 Add ${(50 - totalPrice).toFixed(2)} more for free shipping
                  </p>
                )}
              </div>
              <div className="flex justify-between text-lg font-extrabold text-gray-900 dark:text-white mb-6">
                <span>Total</span>
                <span className="text-green-600 dark:text-green-400">₹{(totalPrice + shippingPrice).toFixed(2)}</span>
              </div>
              <Link href="/checkout" className="block w-full bg-gradient-to-r from-green-600 to-green-500 text-white text-center font-bold py-4 rounded-xl hover:shadow-lg hover:from-green-700 hover:to-green-600 transition transform hover:-translate-y-0.5">
                Proceed to Checkout
              </Link>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
                <Shield size={14} />
                <span>Secure checkout • 100% safe</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
