'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { getImageUrl } from '@/utils/api';
import { Trash2, ShoppingCart as CartIcon, Minus, Plus, ArrowLeft, Shield, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function Cart() {
  const { cart, removeFromCart, addToCart, clearCart } = useStore();
  const [showClearCartModal, setShowClearCartModal] = useState(false);

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

  const sellerCharges = new Map<string, number>();
  cart.forEach(item => {
    if (!sellerCharges.has(item.seller) || (item.sellerDeliveryCharge ?? 5) > sellerCharges.get(item.seller)!) {
      sellerCharges.set(item.seller, item.sellerDeliveryCharge ?? 5);
    }
  });
  const shippingPrice = Array.from(sellerCharges.values()).reduce((a, b) => a + b, 0);

  const groupedCart = cart.reduce((acc, item) => {
    const sellerId = item.seller;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerName: item.sellerName || 'Unnamed Store',
        items: [],
        deliveryCharge: item.sellerDeliveryCharge ?? 5
      };
    }
    acc[sellerId].items.push(item);
    return acc;
  }, {} as Record<string, { sellerName: string, items: any[], deliveryCharge: number }>);

  return (
    <div className="py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Shopping Cart</h1>
          {cart.length > 0 && (
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-bold">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => setShowClearCartModal(true)}
            className="flex items-center justify-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/30 px-4 py-2 rounded-xl transition w-full sm:w-auto"
          >
            <Trash2 size={16} /> Empty Cart
          </button>
        )}
      </div>

      {/* Empty State */}
      {cart.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-16 text-center rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-100 dark:border-green-800">
            <CartIcon size={44} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
            Looks like you haven&apos;t added any items yet. Start shopping to fill it up!
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-3 px-10 rounded-xl hover:shadow-lg hover:from-green-700 hover:to-green-600 transition transform hover:-translate-y-0.5"
          >
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="w-full lg:w-2/3 space-y-3">
            <AnimatePresence>
              {Object.entries(groupedCart).map(([sellerId, group]) => (
                <div key={sellerId} className="mb-6">
                  {/* Seller Header */}
                  <div className="flex justify-between items-center mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <h3 className="font-bold text-gray-900 dark:text-gray-200">{group.sellerName}</h3>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Tag size={11} /> Delivery ₹{group.deliveryCharge}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item, index) => (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        key={item.product}
                        className="flex items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-green-200 dark:hover:border-green-800/50 transition-all"
                      >
                        {/* Product Image */}
                        <div className="w-20 h-20 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border border-gray-100 dark:border-gray-600">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/100x100/f0fdf4/16a34a?text=${encodeURIComponent(item.name[0])}`;
                            }}
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-grow px-4 min-w-0">
                          <Link href={`/product/${item.product}`}>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition truncate">
                              {item.name}
                            </h3>
                          </Link>
                          <p className="text-green-600 dark:text-green-400 font-extrabold mt-1 text-lg">
                            ₹{item.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Subtotal: <span className="font-semibold text-gray-700 dark:text-gray-300">₹{(item.price * item.qty).toFixed(2)}</span>
                          </p>
                        </div>

                        {/* Qty + Remove */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => handleQtyChange(item, item.qty - 1)}
                              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-red-500 transition"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="px-4 text-sm font-bold text-gray-900 dark:text-white min-w-[2rem] text-center bg-white dark:bg-gray-800">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => handleQtyChange(item, item.qty + 1)}
                              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-green-600 transition"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemove(item)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Remove item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h3>

              <div className="space-y-3 border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                  <span className="font-semibold text-gray-900 dark:text-white">₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className={`font-semibold ${shippingPrice === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                    {shippingPrice === 0 ? 'Free' : `₹${shippingPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-extrabold text-gray-900 dark:text-white mb-6">
                <span>Total</span>
                <span className="text-green-600 dark:text-green-400">₹{(totalPrice + shippingPrice).toFixed(2)}</span>
              </div>

              <Link
                href="/checkout"
                className="block w-full bg-gradient-to-r from-green-600 to-green-500 text-white text-center font-bold py-4 rounded-xl hover:shadow-lg hover:from-green-700 hover:to-green-600 transition transform hover:-translate-y-0.5"
              >
                Proceed to Checkout →
              </Link>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-4">
                <Shield size={13} className="text-green-500" />
                <span>Secure checkout · 100% safe</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showClearCartModal}
        onClose={() => setShowClearCartModal(false)}
        onConfirm={() => {
          clearCart();
          toast.success('Cart cleared');
        }}
        title="Empty Cart"
        message="Are you sure you want to empty your entire cart? This action cannot be undone."
        confirmText="Yes, Empty Cart"
        isDanger={true}
      />
    </div>
  );
}
