'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api, { getImageUrl } from '@/utils/api';
import Link from 'next/link';
import { Package, Truck, CheckCircle2, ChevronLeft, MapPin, CreditCard, Receipt, Clock, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderDetails() {
  const params = useParams();
  const router = useRouter();
  const { userInfo } = useStore();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) {
      router.push('/login');
      return;
    }
    fetchOrder();
  }, [userInfo, params.id, router]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${params.id}`);
      setOrder(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
          <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Not Found</h2>
        <Link href="/" className="text-green-600 mt-4 inline-block hover:underline">Return Home</Link>
      </div>
    );
  }

  const statuses = ['Pending', 'Packed', 'Shipped', 'Delivered'];
  const currentStatusIndex = statuses.indexOf(order.status) === -1 ? 0 : statuses.indexOf(order.status);
  const progressPercent = (currentStatusIndex / (statuses.length - 1)) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div>
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition font-semibold mb-2">
            <ChevronLeft size={16} /> Back to Orders
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            Order <span className="text-green-600 dark:text-green-400 font-mono text-xl sm:text-2xl bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-lg">#{order._id.slice(-8)}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-sm">
            <Clock size={14} /> Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-left sm:text-right w-full sm:w-auto p-4 sm:p-0 bg-gray-50 sm:bg-transparent dark:bg-gray-700/50 sm:dark:bg-transparent rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1 uppercase tracking-wider">Total Amount</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white">₹{order.totalPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative transition-colors">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-8">Tracking Status</h3>
        <div className="relative max-w-3xl mx-auto">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${order.status === 'Cancelled' ? 'bg-red-500' : 'bg-green-500'}`}
            />
          </div>

          <div className="relative flex justify-between">
            {statuses.map((s, i) => {
              const isCompleted = i <= currentStatusIndex && order.status !== 'Cancelled';
              const isCurrent = i === currentStatusIndex && order.status !== 'Cancelled';
              
              return (
                <div key={s} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-4 transition-all duration-500 ${
                    isCompleted ? 'bg-green-500 border-green-100 dark:border-green-900 shadow-lg shadow-green-200 dark:shadow-green-900/50 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'
                  }`}>
                    {s === 'Pending' ? <Clock size={20} /> : s === 'Packed' ? <Package size={20} /> : s === 'Shipped' ? <Truck size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <p className={`mt-3 font-bold text-sm ${isCurrent ? 'text-green-600 dark:text-green-400' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{s}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <ShoppingBag className="text-blue-500" /> Items in Order
            </h3>
            <div className="space-y-4">
              {order.orderItems.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 transition-colors bg-gray-50 dark:bg-gray-800/50">
                  <img src={getImageUrl(item.image)} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-white dark:bg-gray-700 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.product}`}>
                      <h4 className="font-bold text-gray-900 dark:text-white hover:text-green-600 transition truncate">{item.name}</h4>
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Qty: {item.qty} × ₹{item.price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-gray-900 dark:text-white">₹{(item.qty * item.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shipping Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="text-red-500" /> Delivery Address
            </h3>
            <div className="text-gray-600 dark:text-gray-300 space-y-1 text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
              <p className="font-bold text-gray-900 dark:text-white mb-2">{order.user?.name}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="text-purple-500" /> Payment Details
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Method</span>
                <span className="font-bold text-gray-900 dark:text-white">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Status</span>
                {order.isPaid ? (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-md text-xs font-bold uppercase">Paid on {new Date(order.paidAt).toLocaleDateString()}</span>
                ) : (
                  <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-md text-xs font-bold uppercase">{order.paymentMethod === 'COD' ? 'Pending Delivery' : 'Unpaid'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Receipt className="text-indigo-500" /> Order Summary
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between"><span>Items</span><span className="font-medium text-gray-900 dark:text-white">₹{order.itemsPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span className="font-medium text-gray-900 dark:text-white">₹{order.shippingPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span className="font-medium text-gray-900 dark:text-white">₹{order.taxPrice.toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between items-center text-xl font-extrabold text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-green-600 dark:text-green-400">₹{order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
