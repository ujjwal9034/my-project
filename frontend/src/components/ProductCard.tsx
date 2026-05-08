'use client';

import Link from 'next/link';
import { useStore, CartItem } from '@/store/useStore';
import { getImageUrl } from '@/utils/api';
import api from '@/utils/api';
import { ShoppingCart, Star, Heart, Truck, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ReplaceCartModal from './ReplaceCartModal';
import { useState } from 'react';

interface ProductCardProps {
  product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, userInfo, wishlist, toggleWishlistItem, cart, updateCartQty, removeFromCart, clearCart } = useStore();
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock <= 0) {
      toast.error('Out of stock');
      return;
    }

    const sellerId = typeof product.seller === 'object' ? product.seller._id : product.seller;
    const sellerName = typeof product.seller === 'object' ? (product.seller.storeName || 'Unnamed Store') : 'Unnamed Store';

    // Single-store restriction check
    if (cart.length > 0) {
      const existingSeller = cart[0].seller;
      if (existingSeller !== sellerId) {
        setShowReplaceModal(true);
        return;
      }
    }

    executeAddToCart(sellerId, sellerName);
  };

  const executeAddToCart = (sellerId: string, sellerName: string) => {
    const item: CartItem = {
      product: product._id,
      name: product.name,
      price: product.price,
      qty: 1,
      image: product.imageUrl,
      seller: sellerId,
      sellerName: sellerName,
      sellerPickupSlots: typeof product.seller === 'object' ? product.seller.pickupSlots : undefined,
      sellerDeliveryCharge: typeof product.seller === 'object' ? (product.seller.deliveryCharge ?? 5) : 5,
    };
    addToCart(item);
    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      toast.error('Please login to add to wishlist');
      return;
    }

    const isInWishlist = wishlist.includes(product._id);
    toggleWishlistItem(product._id);

    try {
      if (isInWishlist) {
        await api.delete(`/wishlist/${product._id}`);
        toast.success('Removed from wishlist');
      } else {
        await api.post(`/wishlist/${product._id}`);
        toast.success('Added to wishlist ❤️');
      }
    } catch (error: any) {
      // Revert on error
      toggleWishlistItem(product._id);
      toast.error(error.response?.data?.message || 'Failed to update wishlist');
    }
  };

  const isInWishlist = wishlist.includes(product._id);
  const cartItem = cart.find(x => x.product === product._id);
  const sellerName = typeof product.seller === 'object' ? (product.seller?.storeName || 'Unnamed Store') : 'Unnamed Store';

  return (
    <>
      <Link href={`/product/${product._id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-xl hover:shadow-green-50 dark:hover:shadow-green-900/10 transition-all duration-300 h-full flex flex-col"
      >
        {/* Image */}
        <div className="relative h-44 sm:h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <img
            src={getImageUrl(product.imageUrl)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.png';
            }}
          />
          
          {/* Category Badge */}
          <span className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-green-700 dark:text-green-400 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider">
            {product.category}
          </span>
          
          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all shadow-sm ${
              isInWishlist 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            <Heart size={16} fill={isInWishlist ? 'white' : 'none'} />
          </button>

          {/* Out of Stock overlay */}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex-grow">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 truncate text-sm sm:text-base group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {product.name}
            </h3>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Store: <span className="font-semibold text-gray-600 dark:text-gray-300">{sellerName}</span>
              </p>
            </div>

            <div className="flex gap-2 mb-3">
              {product.seller?.deliveryAvailable && (
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Truck size={10} /> Delivery
                </span>
              )}
              {product.seller?.pickupAvailable && (
                <span className="text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Package size={10} /> Pickup
                </span>
              )}
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={12}
                    className={star <= Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-600'}
                  />
                ))}
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-500 font-medium">
                ({product.numReviews || 0})
              </span>
            </div>
          </div>

            {/* Price & Cart */}
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-xl font-extrabold text-green-600 dark:text-green-400">
              ₹{product.price.toFixed(2)} {product.unit && <span className="text-xs text-gray-600 font-medium">/ {product.unit}</span>}
            </span>
            {cartItem ? (
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800" onClick={e => e.preventDefault()}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (cartItem.qty === 1) {
                      removeFromCart(product._id);
                      toast.success('Removed from cart');
                    } else {
                      updateCartQty(product._id, cartItem.qty - 1);
                    }
                  }}
                  className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition rounded-l-xl"
                >
                  <span className="text-lg font-bold leading-none mb-1">-</span>
                </button>
                <span className="text-sm font-bold text-gray-800 dark:text-white px-2 text-center">{cartItem.qty}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (cartItem.qty < product.stock) {
                      updateCartQty(product._id, cartItem.qty + 1);
                    } else {
                      toast.error(`Only ${product.stock} items available`);
                    }
                  }}
                  className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition rounded-r-xl"
                >
                  <span className="text-lg font-bold leading-none mb-0.5">+</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={`p-2.5 rounded-xl transition-all transform active:scale-95 ${
                  product.stock > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-lg hover:shadow-green-200 dark:hover:shadow-green-900/30'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
      <ReplaceCartModal
        isOpen={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        onConfirm={() => {
          clearCart();
          setShowReplaceModal(false);
          const sellerId = typeof product.seller === 'object' ? product.seller._id : product.seller;
          executeAddToCart(sellerId, sellerName);
        }}
        newStoreName={sellerName}
      />
    </>
  );
}
