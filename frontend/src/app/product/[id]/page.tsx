'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { getImageUrl } from '@/utils/api';
import { useStore } from '@/store/useStore';
import { Star, ShoppingCart, Minus, Plus, ArrowLeft, Shield, Truck, Package, Heart, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ReplaceCartModal from '@/components/ReplaceCartModal';

export default function ProductDetails() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, userInfo, addRecentlyViewed, wishlist, toggleWishlistItem, cart, updateCartQty, removeFromCart, clearCart } = useStore();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [hasOrdered, setHasOrdered] = useState<boolean | null>(null);

  useEffect(() => {
    fetchProduct();
    checkPurchase();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${params.id}`);
      setProduct(data);
      addRecentlyViewed(data._id);
    } catch (error) {
      toast.error('Product not found');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const checkPurchase = async () => {
    if (!userInfo) return;
    try {
      const { data } = await api.get('/orders/myorders');
      const purchased = data.some((order: any) =>
        order.status === 'Delivered' || order.status === 'Picked Up'
          ? order.orderItems.some((item: any) => item.product === params.id || item.product?._id === params.id)
          : false
      );
      setHasOrdered(purchased);
    } catch {
      setHasOrdered(false);
    }
  };

  const handleAddToCart = () => {
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
    addToCart({
      product: product._id,
      name: product.name,
      price: product.price,
      qty,
      image: product.imageUrl,
      seller: sellerId,
      sellerName: sellerName,
      sellerPickupSlots: typeof product.seller === 'object' ? product.seller.pickupSlots : undefined,
      sellerDeliveryCharge: typeof product.seller === 'object' ? (product.seller.deliveryCharge ?? 5) : 5,
    });
    toast.success('Added to cart');
  };

  const handleWishlist = async () => {
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
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toggleWishlistItem(product._id);
      toast.error('Failed to update wishlist');
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setReviewLoading(true);
    try {
      await api.post(`/products/${params.id}/reviews`, { rating, comment });
      toast.success('Review submitted!');
      setRating(0);
      setComment('');
      fetchProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await api.delete(`/products/${params.id}/reviews/${reviewId}`);
      toast.success('Review deleted');
      fetchProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete review');
    }
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-3xl" />
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-3/4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
        </div>
      </div>
    </div>
  );

  if (!product) return null;

  const isInWishlist = wishlist.includes(product._id);
  const cartItem = cart.find(x => x.product === product._id);

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-600 transition font-medium">
        <ArrowLeft size={18} /> Back to shopping
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <img
            src={getImageUrl(product.imageUrl)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={handleWishlist}
            className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-sm transition-all shadow-lg ${
              isInWishlist ? 'bg-red-500 text-white' : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            <Heart size={24} fill={isInWishlist ? 'white' : 'none'} />
          </button>
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white px-6 py-2 rounded-full text-lg font-bold uppercase tracking-widest shadow-2xl transform -rotate-12 border-4 border-white/20">
                Out of Stock
              </span>
            </div>
          )}
        </motion.div>

        {/* Product Details */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-lg">
              {product.category}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
              Store: <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">{product.seller?.storeName || 'Unnamed Store'} {product.seller?.isApproved && <span title="Verified Seller" className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-0.5 rounded-full"><Shield size={12} className="fill-current" /></span>}</span>
            </span>
          </div>
          
          <div className="flex gap-2 mb-4">
            {product.seller?.deliveryAvailable && (
              <span className="text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md flex items-center gap-1">
                <Truck size={12} /> Delivery (₹{product.seller?.deliveryCharge ?? 5})
              </span>
            )}
            {product.seller?.pickupAvailable && (
              <span className="text-xs font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded-md flex items-center gap-1">
                <Package size={12} /> Store Pickup
              </span>
            )}
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={18} className={s <= Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'} />
              ))}
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{product.numReviews} Reviews</span>
          </div>

          <div className="text-5xl font-extrabold text-green-600 dark:text-green-400 mb-8 tracking-tight">
            ₹{product.price.toFixed(2)} {product.unit && <span className="text-xl text-gray-500 font-medium">/ {product.unit}</span>}
          </div>

          {/* Add to Cart Actions */}
          {product.stock > 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl mb-8 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Quantity</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 rounded-md">
                  {product.stock} Available
                </span>
              </div>
              
              {cartItem ? (
                <div className="flex gap-4">
                  <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800">
                    <button 
                      onClick={() => {
                        if (cartItem.qty === 1) {
                          removeFromCart(product._id);
                          toast.success('Removed from cart');
                        } else {
                          updateCartQty(product._id, cartItem.qty - 1);
                        }
                      }} 
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition rounded-l-xl"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="px-6 font-bold text-lg text-gray-900 dark:text-white">{cartItem.qty}</span>
                    <button 
                      onClick={() => {
                        if (cartItem.qty < product.stock) {
                          updateCartQty(product._id, cartItem.qty + 1);
                        } else {
                          toast.error(`Only ${product.stock} items available`);
                        }
                      }} 
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition rounded-r-xl"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    onClick={() => router.push('/cart')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition"
                  >
                    View Cart
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition rounded-l-xl">
                      <Minus size={18} />
                    </button>
                    <span className="px-6 font-bold text-lg text-gray-900 dark:text-white">{qty}</span>
                    <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition rounded-r-xl">
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl hover:shadow-lg hover:from-green-700 hover:to-green-600 transition active:scale-95"
                  >
                    <ShoppingCart size={20} /> Add to Cart
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl mb-8 border border-red-100 dark:border-red-800 flex items-center gap-3">
              <Package size={24} />
              <span className="font-bold">This item is currently out of stock.</span>
            </div>
          )}

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <Truck className="text-blue-500" /> Fast Delivery
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <Shield className="text-green-500" /> Secure Payment
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-16 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveTab('description')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${
              activeTab === 'description' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-white dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${
              activeTab === 'reviews' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-white dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Reviews ({product.numReviews})
          </button>
        </div>

            <div className="p-8">
              {activeTab === 'description' ? (
                <div className="prose prose-green dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product.description}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Rating Summary */}
                  {product.numReviews > 0 && (
                    <div className="flex items-center gap-6 p-5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-5xl font-extrabold text-gray-900 dark:text-white">{product.rating.toFixed(1)}</p>
                        <div className="flex justify-center gap-0.5 mt-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={16} className={s <= Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.numReviews} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map(star => {
                          const count = product.reviews.filter((r: any) => Math.round(r.rating) === star).length;
                          const pct = product.numReviews > 0 ? (count / product.numReviews) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-gray-700 dark:text-gray-300 font-bold">{star}</span>
                              <Star size={10} className="text-yellow-400 fill-yellow-400" />
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-4 text-gray-500 dark:text-gray-400">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Write Review */}
                  {userInfo ? (
                    hasOrdered === true ? (
                      product.reviews.find((r: any) => r.user?._id === userInfo._id || r.user === userInfo._id) ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                          <Star size={16} className="fill-green-500 text-green-500" /> You have already reviewed this product.
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Write a Review</h3>
                          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-4 flex items-center gap-1">✓ Verified Purchase</p>
                          <form onSubmit={submitReview} className="space-y-4">
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={28}
                                  onClick={() => setRating(s)}
                                  className={`cursor-pointer transition-all ${s <= rating ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'}`}
                                />
                              ))}
                            </div>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Share your experience with this product..."
                              required
                              rows={3}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none resize-none transition text-gray-900"
                            />
                            <button
                              type="submit"
                              disabled={reviewLoading}
                              className="bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {reviewLoading ? 'Submitting...' : 'Submit Review'}
                            </button>
                          </form>
                        </div>
                      )
                    ) : hasOrdered === false ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-400 font-medium">
                        🛒 You can only review products you have purchased and received.
                      </div>
                    ) : null
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                      <Link href="/login" className="text-green-600 dark:text-green-400 font-bold hover:underline">Login</Link> to write a review.
                    </div>
                  )}

                  {/* Review List */}
                  <div className="space-y-5">
                    {product.reviews.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-12">No reviews yet. Be the first to review!</p>
                    ) : (
                      product.reviews.map((r: any) => (
                        <div key={r._id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {r.user?.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{r.user?.name || 'User'}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} size={13} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Clock size={10} /> {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {userInfo && (r.user?._id === userInfo._id || r.user === userInfo._id || userInfo.role === 'admin') && (
                              <button
                                onClick={() => deleteReview(r._id)}
                                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded-lg transition font-semibold"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-13">{r.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
      </div>
      <ReplaceCartModal
        isOpen={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        onConfirm={() => {
          clearCart();
          setShowReplaceModal(false);
          const sellerId = typeof product.seller === 'object' ? product.seller._id : product.seller;
          const sellerName = typeof product.seller === 'object' ? (product.seller.storeName || 'Unnamed Store') : 'Unnamed Store';
          executeAddToCart(sellerId, sellerName);
        }}
        newStoreName={typeof product.seller === 'object' ? (product.seller.storeName || 'Unnamed Store') : 'Unnamed Store'}
      />
    </div>
  );
}
