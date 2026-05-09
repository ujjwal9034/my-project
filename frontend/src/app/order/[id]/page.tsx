'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api, { getImageUrl } from '@/utils/api';
import Link from 'next/link';
import { Package, Truck, CheckCircle2, ChevronLeft, MapPin, CreditCard, Receipt, Clock, ShoppingBag, XCircle, AlertCircle, RefreshCw, Download, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { requestNotificationPermission, sendNotification } from '@/utils/notifications';

export default function OrderDetails() {
  const params = useParams();
  const router = useRouter();
  const { userInfo, addToCart, clearCart } = useStore();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reordering, setReordering] = useState(false);

  const fetchOrder = useCallback(async (currentStatus?: string) => {
    try {
      const { data } = await api.get(`/orders/${params.id}`);
      if (currentStatus && data.status !== currentStatus) {
        sendNotification('Order Update!', {
          body: `Your order #${data._id.slice(-8)} is now: ${data.status}`,
        });
        toast.success(`Order status updated to: ${data.status}`);
      }
      setOrder(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!userInfo) {
      router.push('/login');
      return;
    }
    requestNotificationPermission();
    fetchOrder();
    // Real-time polling for active orders
    const isActive = order && !['Delivered', 'Picked Up', 'Cancelled'].includes(order.status);
    if (isActive) {
      const interval = setInterval(() => fetchOrder(order.status), 15000);
      return () => clearInterval(interval);
    }
  }, [userInfo, params.id, router, fetchOrder, order?.status]);

  const cancelOrder = async () => {
    try {
      await api.put(`/orders/${order._id}/status`, { status: 'Cancelled' });
      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleReorder = async () => {
    setReordering(true);
    try {
      clearCart();
      for (const item of order.orderItems) {
        addToCart({
          product: item.product,
          name: item.name,
          price: item.price,
          qty: item.qty,
          image: item.image,
          seller: item.seller || '',
          sellerName: '',
        });
      }
      toast.success('Items added to cart!');
      router.push('/cart');
    } catch {
      toast.error('Failed to reorder');
    } finally {
      setReordering(false);
    }
  };

  const generateInvoice = () => {
    if (!order) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FreshMart Grocery', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Tax Invoice / Receipt', 20, 32);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Invoice #${order._id.slice(-8).toUpperCase()}`, pageW - 20, 25, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, pageW - 20, 32, { align: 'right' });

    // Divider
    doc.setDrawColor(200);
    doc.line(20, 38, pageW - 20, 38);

    // Billing
    let y = 46;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.user?.name || 'Customer', 20, y + 6);
    doc.text(order.shippingAddress?.address || '', 20, y + 12);
    doc.text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.postalCode || ''}`, 20, y + 18);

    // Items Table Header
    y = 80;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y - 4, pageW - 40, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Item', 22, y + 2);
    doc.text('Qty', 120, y + 2);
    doc.text('Price', 140, y + 2);
    doc.text('Total', pageW - 22, y + 2, { align: 'right' });

    // Items
    y += 14;
    doc.setFont('helvetica', 'normal');
    for (const item of order.orderItems) {
      doc.text(item.name.substring(0, 40), 22, y);
      doc.text(String(item.qty), 122, y);
      doc.text(`Rs.${item.price.toFixed(2)}`, 140, y);
      doc.text(`Rs.${(item.qty * item.price).toFixed(2)}`, pageW - 22, y, { align: 'right' });
      y += 8;
    }

    // Summary
    y += 6;
    doc.line(120, y, pageW - 20, y);
    y += 8;
    doc.text('Subtotal:', 120, y);
    doc.text(`Rs.${order.itemsPrice.toFixed(2)}`, pageW - 22, y, { align: 'right' });
    y += 7;
    doc.text('Shipping:', 120, y);
    doc.text(`Rs.${order.shippingPrice.toFixed(2)}`, pageW - 22, y, { align: 'right' });
    y += 7;
    doc.text('Tax:', 120, y);
    doc.text(`Rs.${order.taxPrice.toFixed(2)}`, pageW - 22, y, { align: 'right' });
    y += 3;
    doc.line(120, y, pageW - 20, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 120, y);
    doc.text(`Rs.${order.totalPrice.toFixed(2)}`, pageW - 22, y, { align: 'right' });

    // Footer
    y += 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130);
    doc.text('Thank you for shopping with FreshMart Grocery!', pageW / 2, y, { align: 'center' });
    doc.text(`Payment Method: ${order.paymentMethod} | Status: ${order.isPaid ? 'Paid' : 'Pending'}`, pageW / 2, y + 5, { align: 'center' });

    doc.save(`FreshMart_Invoice_${order._id.slice(-8).toUpperCase()}.pdf`);
    toast.success('Invoice downloaded!');
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

  const isDelivery = order.deliveryType !== 'Pickup';
  const statuses = isDelivery
    ? ['Pending', 'Packed', 'Shipped', 'Delivered']
    : ['Pending', 'Packed', 'Ready for Pickup', 'Picked Up'];
  const isCancelled = order.status === 'Cancelled';
  const currentStatusIndex = isCancelled ? -1 : statuses.indexOf(order.status);
  const isActive = !isCancelled && !['Delivered', 'Picked Up'].includes(order.status);

  const stepMeta: Record<string, { icon: any; desc: string; color: string }> = {
    'Pending':          { icon: Clock,       desc: 'Order received and being reviewed by the seller', color: 'amber' },
    'Packed':           { icon: Package,     desc: 'Items packed and ready for dispatch', color: 'blue' },
    'Shipped':          { icon: Truck,       desc: 'On the way to your delivery address', color: 'indigo' },
    'Delivered':        { icon: CheckCircle2,desc: 'Successfully delivered to you', color: 'green' },
    'Ready for Pickup': { icon: ShoppingBag, desc: 'Ready! Visit the store to collect', color: 'indigo' },
    'Picked Up':        { icon: CheckCircle2,desc: 'You have collected your order', color: 'green' },
  };

  // Calculate estimated delivery
  const orderDate = new Date(order.createdAt);
  const estimatedDate = new Date(orderDate.getTime() + (isDelivery ? 2 : 1) * 24 * 60 * 60 * 1000);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.round((estimatedDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

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
        <div className="text-left sm:text-right w-full sm:w-auto p-4 sm:p-0 bg-gray-50 sm:bg-transparent dark:bg-gray-700/50 sm:dark:bg-transparent rounded-xl flex flex-col items-start sm:items-end">
          <div className="mb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1 uppercase tracking-wider">Total Amount</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">₹{order.totalPrice.toFixed(2)}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {['Pending', 'Packed'].includes(order.status) && order.user?._id === userInfo?._id && (
              <button onClick={() => setShowCancelModal(true)} className="text-sm font-bold px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition rounded-xl flex items-center gap-1 shadow-sm">
                <XCircle size={16} /> Cancel Order
              </button>
            )}
            {['Shipped', 'Ready for Pickup'].includes(order.status) && order.user?._id === userInfo?._id && (
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <XCircle size={14} /> Cancellation not available after dispatch
              </div>
            )}
            {(order.status === 'Delivered' || order.status === 'Picked Up') && order.user?._id === userInfo?._id && (
              <button onClick={handleReorder} disabled={reordering} className="text-sm font-bold px-4 py-2 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                <RotateCcw size={16} className={reordering ? 'animate-spin' : ''} /> {reordering ? 'Adding...' : 'Reorder'}
              </button>
            )}
            <button onClick={generateInvoice} className="text-sm font-bold px-4 py-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition rounded-xl flex items-center gap-1.5 shadow-sm">
              <Download size={16} /> Invoice
            </button>
          </div>
        </div>
      </div>

      {/* ── Premium Live Order Tracking ── */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        {/* Tracking Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            {isDelivery ? <Truck className="text-green-500" size={22} /> : <ShoppingBag className="text-green-500" size={22} />}
            Live Order Tracking
          </h3>
          {isActive && (
            <span className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live Updates
            </span>
          )}
        </div>

        {/* ETA Banner */}
        {isActive && !isCancelled && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Estimated {isDelivery ? 'Delivery' : 'Ready for Pickup'}
                </p>
                <p className="text-lg font-extrabold text-green-700 dark:text-green-400">
                  {estimatedDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {hoursLeft > 0 && <span className="text-sm font-semibold ml-2 text-green-600 dark:text-green-500">~{hoursLeft}h left</span>}
                </p>
              </div>
              <div className="text-4xl">{isDelivery ? '🚚' : '🏪'}</div>
            </div>
          </motion.div>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <XCircle className="text-red-500" size={24} />
            </div>
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">Order Cancelled</p>
              <p className="text-sm text-red-600/70 dark:text-red-400/70">This order has been cancelled. You can reorder anytime.</p>
            </div>
          </motion.div>
        )}

        {/* Vertical Timeline */}
        {!isCancelled && (
          <div className="relative pl-4 sm:pl-8">
            {statuses.map((s, i) => {
              const isCompleted = i <= currentStatusIndex;
              const isCurrent = i === currentStatusIndex;
              const isPast = i < currentStatusIndex;
              const meta = stepMeta[s] || stepMeta['Pending'];
              const StepIcon = meta.icon;
              const isLast = i === statuses.length - 1;

              return (
                <motion.div key={s}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  className={`relative flex gap-4 sm:gap-6 ${!isLast ? 'pb-8' : ''}`}
                >
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute left-[19px] sm:left-[23px] top-12 bottom-0 w-0.5">
                      <div className={`h-full ${isCompleted && !isCurrent ? 'bg-green-400 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                      {isCurrent && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: '100%' }}
                          transition={{ duration: 2, ease: 'easeInOut' }}
                          className="absolute top-0 left-0 w-full bg-gradient-to-b from-green-400 to-transparent dark:from-green-600"
                        />
                      )}
                    </div>
                  )}

                  {/* Step circle */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-[3px] transition-all duration-500 ${
                      isCompleted
                        ? 'bg-green-500 border-green-200 dark:border-green-800 text-white shadow-lg shadow-green-200/50 dark:shadow-green-900/50'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'
                    }`}>
                      <StepIcon size={18} />
                    </div>
                    {/* Pulse on current step */}
                    {isCurrent && isActive && (
                      <span className="absolute -inset-1 rounded-full animate-ping bg-green-400/30 dark:bg-green-500/20" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className={`flex-1 ${isCurrent ? 'bg-green-50/50 dark:bg-green-900/10 -mx-2 px-4 py-3 rounded-2xl border border-green-100 dark:border-green-800/30' : 'pt-1'}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-bold text-sm sm:text-base ${
                        isCurrent ? 'text-green-700 dark:text-green-400' :
                        isCompleted ? 'text-gray-900 dark:text-white' :
                        'text-gray-400 dark:text-gray-500'
                      }`}>{s}</h4>
                      {isCurrent && isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Current</span>
                      )}
                      {isPast && (
                        <CheckCircle2 size={14} className="text-green-500" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm mt-1 ${isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}`}>
                      {meta.desc}
                    </p>
                    {isCompleted && (
                      <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                        <Clock size={10} />
                        {i === 0 ? new Date(order.createdAt).toLocaleString() :
                         i === statuses.length - 1 && order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() :
                         new Date(new Date(order.createdAt).getTime() + i * 8 * 60 * 60 * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
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
      
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={cancelOrder}
        title="Cancel Order"
        message={order.status === 'Packed' 
          ? "⚠️ This order has already been packed by the seller. Are you sure you want to cancel? This may affect the seller and cannot be undone."
          : "Are you sure you want to cancel this order? This action cannot be undone."
        }
        confirmText="Yes, Cancel Order"
        isDanger={true}
      />
    </div>
  );
}
