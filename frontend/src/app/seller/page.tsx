'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api, { getImageUrl } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Upload, X, Camera, Trash2, Edit3, Plus, TrendingUp, ShoppingBag, Save, MapPin, AlertTriangle, Bell, Eye, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function SellerDashboard() {
  const { userInfo, setUserInfo, sellerHiddenOrderIds, hideSellerOrder, seenOrderIds, markOrderSeen } = useStore();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings' | 'reviews'>('products');

  // Store Settings
  const [storeName, setStoreName] = useState(userInfo?.storeName || '');
  const [deliveryAvailable, setDeliveryAvailable] = useState(userInfo?.deliveryAvailable ?? true);
  const [pickupAvailable, setPickupAvailable] = useState(userInfo?.pickupAvailable ?? true);
  const [deliveryCharge, setDeliveryCharge] = useState(userInfo?.preferences?.deliveryCharge || '');
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(userInfo?.preferences?.freeDeliveryAbove || '');
  
  const [pickupSlots, setPickupSlots] = useState<string[]>(userInfo?.pickupSlots || ['10:00 AM - 12:00 PM', '04:00 PM - 06:00 PM']);
  const [newSlotInput, setNewSlotInput] = useState('');
  
  const [storeLocating, setStoreLocating] = useState(false);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number} | null>(
    userInfo?.location?.coordinates ? { lng: userInfo.location.coordinates[0], lat: userInfo.location.coordinates[1] } : null
  );

  // New product form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kycInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userInfo) {
      router.push('/login');
    } else if (userInfo.role !== 'seller') {
      router.push('/profile');
    } else {
      fetchData();
      const interval = setInterval(() => {
        fetchData();
      }, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userInfo, router]);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, reportsRes] = await Promise.all([
        api.get('/orders/seller'),
        api.get('/products/seller/mine'),
        api.get('/reports/seller')
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setReports(reportsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddForm = () => {
    setEditingId(null);
    setName(''); setPrice(''); setStock(''); setUnit('kg'); setCategory(''); setDescription('');
    removeImage();
    setShowForm(true);
  };

  const openEditForm = (product: any) => {
    setEditingId(product._id);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setUnit(product.unit || 'kg');
    setCategory(product.category);
    setDescription(product.description);
    setImagePreview(getImageUrl(product.imageUrl));
    setImageFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveProductHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('unit', unit);
      formData.append('category', category);
      formData.append('description', description);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product added successfully');
      }

      // Reset form
      openAddForm();
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setProductLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status}`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const totalRevenue = orders.reduce((acc: number, o: any) => acc + (o.totalPrice || 0), 0);

  const handleUpdateStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSettingsLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        storeName,
        deliveryAvailable,
        pickupAvailable,
        pickupSlots: pickupSlots,
        preferences: {
          ...userInfo?.preferences,
          deliveryCharge,
          freeDeliveryAbove
        }
      });
      setUserInfo(data);
      toast.success('Store settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update store settings');
    } finally {
      setStoreSettingsLoading(false);
    }
  };

  const updateSellerLocation = () => {
    setStoreLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPendingLocation({ lat, lng });
          toast.success('Location acquired. Click Save to confirm.');
        } catch (error) {
          toast.error('Failed to update location');
        } finally {
          setStoreLocating(false);
        }
      }, () => {
        toast.error('Location permission denied');
        setStoreLocating(false);
      });
    } else {
      toast.error('Geolocation not supported');
      setStoreLocating(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!pendingLocation) return;
    setStoreLocating(true);
    try {
      const { data } = await api.put('/users/profile', {
        location: {
          type: 'Point',
          coordinates: [pendingLocation.lng, pendingLocation.lat]
        }
      });
      setUserInfo(data);
      toast.success('Store location saved successfully');
    } catch (error) {
      toast.error('Failed to save location');
    } finally {
      setStoreLocating(false);
    }
  };

  const handleKycUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFile) {
      toast.error('Please select a document first');
      return;
    }
    setKycLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', kycFile);
      const { data } = await api.post('/users/kyc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (userInfo) {
        setUserInfo({ ...userInfo, kycStatus: data.kycStatus, kycDocument: data.kycDocument });
      }
      toast.success(data.message);
      setKycFile(null);
      if (kycInputRef.current) kycInputRef.current.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setKycLoading(false);
    }
  };

  const isWarnedOrBanned = userInfo?.isBanned || userInfo?.account_status === 'warned' || userInfo?.account_status === 'banned';

  return (
    <div className="py-8 max-w-7xl mx-auto space-y-8 px-4">
      {/* Account Notice */}
      {isWarnedOrBanned && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-bold">Account Notice</h3>
            <p className="text-sm text-red-700 dark:text-red-300">Your account has been restricted or warned. Please contact support.</p>
          </div>
        </div>
      )}
      
      {!pendingLocation && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            ⚠️ Your store is not visible to customers until you set your store location.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8 rounded-3xl shadow-2xl">
        <div>
          <h1 className="text-3xl font-extrabold mb-2">Seller Dashboard</h1>
          <p className="text-gray-400">Manage your store inventory, settings, and fulfill orders.</p>
        </div>
        <div className="mt-4 sm:mt-0 text-right">
          <p className="text-xl font-bold">{userInfo?.storeName || userInfo?.name}&apos;s Market</p>
          <span className={`inline-block text-xs px-3 py-1 rounded-full uppercase tracking-widest font-bold mt-2 ${
            userInfo?.isApproved ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
          }`}>
            {userInfo?.isApproved ? 'Active Seller' : 'Pending Approval'}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><Package size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Products</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{products.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl"><ShoppingBag size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Orders</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{orders.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl"><TrendingUp size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Revenue</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">₹{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Revenue Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" /> Revenue Trend
            </h3>
            <div className="flex items-end gap-2 sm:gap-3 h-40 sm:h-48">
              {(() => {
                const monthMap: { [key: string]: number } = {};
                orders.forEach((o: any) => {
                  const d = new Date(o.createdAt);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  monthMap[key] = (monthMap[key] || 0) + (o.totalPrice || 0);
                });
                const entries = Object.entries(monthMap).sort().slice(-6);
                const maxVal = Math.max(...entries.map(([, v]) => v), 1);
                return entries.map(([month, revenue], i) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      ₹{revenue >= 1000 ? `${(revenue / 1000).toFixed(1)}k` : revenue.toFixed(0)}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(revenue / maxVal) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-t-lg min-h-[4px]"
                    />
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400">{month.slice(5)}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Order Status Breakdown */}
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-500" /> Order Status
            </h3>
            <div className="space-y-3">
              {(() => {
                const statusCounts: { [k: string]: number } = {};
                orders.forEach((o: any) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
                const statusColors: { [k: string]: string } = {
                  Pending: 'bg-yellow-500', Packed: 'bg-blue-500', Shipped: 'bg-indigo-500',
                  Delivered: 'bg-green-500', 'Picked Up': 'bg-emerald-500', Cancelled: 'bg-red-500',
                  'Ready for Pickup': 'bg-purple-500',
                };
                return Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{status}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / orders.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${statusColors[status] || 'bg-gray-400'}`}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Top Selling Products */}
          {products.length > 0 && (
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🏆 Top Selling Products
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(() => {
                  const productSales: { [k: string]: { name: string; qty: number; revenue: number } } = {};
                  orders.forEach((o: any) => {
                    o.orderItems?.forEach((item: any) => {
                      const id = item.product || item.name;
                      if (!productSales[id]) productSales[id] = { name: item.name, qty: 0, revenue: 0 };
                      productSales[id].qty += item.qty;
                      productSales[id].revenue += item.qty * item.price;
                    });
                  });
                  return Object.values(productSales)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 4)
                    .map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <span className="text-2xl font-extrabold text-gray-300 dark:text-gray-600 w-8">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.qty} sold · ₹{p.revenue.toFixed(0)}</p>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto scrollbar-hide transition-colors">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'products' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'orders' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Orders
          {orders.filter(o => o.status === 'Pending').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'Pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'reviews' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Reviews
        </button>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Add Product Button */}
          {!showForm && (
            <div className="flex items-center gap-3">
              <button
                onClick={openAddForm}
                disabled={!userInfo?.isApproved}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-lg ${
                  userInfo?.isApproved 
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200 dark:shadow-green-900/30' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <Plus size={20} />
                Add New Product
              </button>
              {!userInfo?.isApproved && (
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle size={16} /> Your store must be approved by an admin to add products.
                </span>
              )}
            </div>
          )}

          {/* Add/Edit Product Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      {editingId ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={saveProductHandler} className="space-y-5">
                    {/* Image Upload Area */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Product Image</label>
                      <div className="flex items-start gap-4">
                        {imagePreview ? (
                          <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-800 shadow-md">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-lg"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-green-400 dark:hover:border-green-500 hover:text-green-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50"
                          >
                            <Camera size={32} />
                            <span className="text-xs font-medium">Upload Image</span>
                            <span className="text-xs">Max 5MB</span>
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" placeholder="e.g., Fresh Organic Tomatoes" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition">
                          <option value="">Select Category</option>
                          <option value="Fruits">Fruits</option>
                          <option value="Vegetables">Vegetables</option>
                          <option value="Dairy">Dairy & Eggs</option>
                          <option value="Bakery">Bakery</option>
                          <option value="Meat">Meat & Seafood</option>
                          <option value="Beverages">Beverages</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Grocery">Grocery Essentials</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Price (₹)</label>
                        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                        <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                        <select value={unit} onChange={(e) => setUnit(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition">
                          <option value="kg">kg</option>
                          <option value="gram">gram</option>
                          <option value="litre">litre</option>
                          <option value="ml">ml</option>
                          <option value="piece">piece</option>
                          <option value="pack">pack</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none" placeholder="Describe your product..." />
                    </div>
                    <div className="flex gap-3">
                      <button disabled={productLoading} type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg hover:from-green-700 hover:to-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {editingId ? <Save size={18} /> : <Upload size={18} />}
                        {productLoading ? 'Saving...' : editingId ? 'Save Changes' : 'Publish Product'}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Search & Grid */}
          {!showForm && products.length > 0 && (
            <div className="mb-4">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search your products..."
                className="w-full sm:w-80 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              />
            </div>
          )}

          {/* My Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(n => <div key={n} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center transition-colors">
              <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">No products yet</h3>
              <p className="text-gray-400 dark:text-gray-500">Click &quot;Add New Product&quot; to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((p: any) => (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group transition-colors"
                >
                  <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <img
                      src={getImageUrl(p.imageUrl)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(p.name)}`;
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold text-green-700 dark:text-green-400">
                      {p.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 dark:text-white truncate">{p.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-extrabold text-green-600 dark:text-green-400">₹{p.price.toFixed(2)}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.stock > 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {p.stock > 0 ? `${p.stock} ${p.unit || ''}` : 'Out of stock'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => openEditForm(p)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => setProductToDelete(p._id)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (() => {
        const visibleOrders = orders.filter(o => !sellerHiddenOrderIds.includes(o._id));
        const pendingCount = visibleOrders.filter(o => o.status === 'Pending').length;
        const deliveredCount = visibleOrders.filter(o => o.status === 'Delivered' || o.status === 'Picked Up').length;

        return (
          <div className="space-y-6">
            {/* Summary Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center"><ShoppingBag size={20} className="text-blue-500" /></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold">Total Orders</p><p className="text-xl font-extrabold dark:text-white">{visibleOrders.length}</p></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center"><Bell size={20} className="text-yellow-500" /></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold">Pending</p><p className="text-xl font-extrabold dark:text-white">{pendingCount}</p></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center"><Package size={20} className="text-green-500" /></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold">Delivered</p><p className="text-xl font-extrabold dark:text-white">{deliveredCount}</p></div>
              </div>
            </div>

            {loading && orders.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-gray-400 font-medium">Loading orders...</span>
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <ShoppingBag size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-lg text-gray-500 dark:text-gray-400">No incoming orders yet.</p>
              </div>
            ) : (
              visibleOrders.map((order: any, index: number) => {
                const isNew = !seenOrderIds.includes(order._id);
                const orderNum = visibleOrders.length - index;

                return (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors relative"
                  >
                    {isNew && (
                      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white dark:border-gray-800 animate-pulse">
                        NEW
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-4 border-b border-gray-50 dark:border-gray-700">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md dark:text-gray-200">
                            Order #{orderNum}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">({order._id.slice(-8)})</span>
                        </div>
                        <p className="font-bold text-gray-800 dark:text-white">{order.user?.name || 'Customer'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{order.user?.email}</p>
                      </div>
                      <div className="mt-2 sm:mt-0 flex flex-col items-end gap-2">
                        <span className="text-lg font-extrabold text-gray-900 dark:text-white">₹{order.totalPrice?.toFixed(2)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          order.status === 'Pending' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200' :
                          order.status === 'Packed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200' :
                          order.status === 'Shipped' || order.status === 'Ready for Pickup' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200' :
                          order.status === 'Delivered' || order.status === 'Picked Up' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200' :
                          'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    
                    {order.deliveryType === 'Pickup' && (
                      <div className="mb-4 text-sm bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-4 py-3 rounded-xl border border-orange-100 dark:border-orange-800/30 font-medium">
                        Store Pickup requested at: {order.pickupSlotTime}
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      {order.orderItems
                        .filter((item: any) => item.seller?.toString() === userInfo?._id || item.seller?._id === userInfo?._id)
                        .map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                            <span className="text-gray-700 dark:text-gray-300">{item.qty}x {item.name}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">₹{(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                          className="flex-1 sm:w-48 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                        >
                          <option value="Pending">Placed (Pending)</option>
                          <option value="Packed">Confirmed (Packed)</option>
                          {order.deliveryType === 'Pickup' ? (
                            <>
                              <option value="Ready for Pickup">Ready</option>
                              <option value="Picked Up">Delivered (Picked Up)</option>
                            </>
                          ) : (
                            <>
                              <option value="Shipped">Ready (Shipped)</option>
                              <option value="Delivered">Delivered</option>
                            </>
                          )}
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        
                        {isNew && (
                          <button 
                            onClick={() => markOrderSeen(order._id)}
                            className="p-2 text-gray-400 hover:text-green-500 bg-gray-50 dark:bg-gray-700 rounded-lg transition"
                            title="Mark as Seen"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => hideSellerOrder(order._id)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg transition font-semibold"
                      >
                        <Trash2 size={16} /> Hide Order
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        );
      })()}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* My Store Panel */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">My Store</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Store ID</p>
                  <p className="font-mono text-sm dark:text-gray-300">{userInfo?._id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Current Location</p>
                  <p className="font-mono text-sm dark:text-gray-300">
                    {pendingLocation ? `${pendingLocation.lat.toFixed(4)}, ${pendingLocation.lng.toFixed(4)}` : 'Not Set'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Edit Store Name</label>
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" placeholder="e.g. FreshFarm Organics" />
              </div>

              {/* KYC Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Shield className="text-blue-500" /> KYC Verification
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    userInfo?.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
                    userInfo?.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    userInfo?.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    Status: {userInfo?.kycStatus || 'Not Submitted'}
                  </span>
                </div>
                
                {userInfo?.kycStatus !== 'verified' && (
                  <form onSubmit={handleKycUpload} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Upload an official ID (Passport, Driving License, etc.) to verify your store and gain the "Verified Seller" badge.
                    </p>
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      ref={kycInputRef}
                      onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button 
                      type="submit" 
                      disabled={!kycFile || kycLoading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {kycLoading ? 'Uploading...' : 'Submit Document'}
                    </button>
                  </form>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={updateSellerLocation} disabled={storeLocating} className="flex-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold px-4 py-3 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition flex items-center justify-center gap-2">
                  <MapPin size={18} /> {storeLocating ? 'Locating...' : 'Use My Current Location'}
                </button>
                <button type="button" onClick={handleSaveLocation} disabled={!pendingLocation || storeLocating} className="flex-1 bg-gray-800 text-white font-bold px-4 py-3 rounded-xl hover:bg-gray-900 transition disabled:opacity-50">
                  Save Store Location
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Settings Panel */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Delivery Settings</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Delivery Available</p>
                  <p className="text-xs text-gray-500">Allow customers to request home delivery.</p>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="delivery" checked={deliveryAvailable} onChange={() => setDeliveryAvailable(true)} className="text-green-500 focus:ring-green-500" /> Yes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="delivery" checked={!deliveryAvailable} onChange={() => setDeliveryAvailable(false)} className="text-green-500 focus:ring-green-500" /> No
                  </label>
                </div>
              </div>

              {deliveryAvailable && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Delivery Charge (₹)</label>
                    <input type="number" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Free Delivery Above (₹)</label>
                    <input type="number" value={freeDeliveryAbove} onChange={(e) => setFreeDeliveryAbove(e.target.value)} placeholder="e.g. 500" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Store Pickup Available</p>
                  <p className="text-xs text-gray-500">Allow customers to pick up from your physical store.</p>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pickup" checked={pickupAvailable} onChange={() => setPickupAvailable(true)} className="text-green-500 focus:ring-green-500" /> Yes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pickup" checked={!pickupAvailable} onChange={() => setPickupAvailable(false)} className="text-green-500 focus:ring-green-500" /> No
                  </label>
                </div>
              </div>

              {pickupAvailable && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Time Slots Manager</label>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      value={newSlotInput} 
                      onChange={(e) => setNewSlotInput(e.target.value)} 
                      placeholder="e.g. 05:00 PM - 07:00 PM" 
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSlotInput.trim()) {
                            setPickupSlots([...pickupSlots, newSlotInput.trim()]);
                            setNewSlotInput('');
                          }
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        if (newSlotInput.trim()) {
                          setPickupSlots([...pickupSlots, newSlotInput.trim()]);
                          setNewSlotInput('');
                        }
                      }}
                      className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700 transition"
                    >
                      Add Slot
                    </button>
                  </div>
                  
                  {pickupSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pickupSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg text-sm">
                          <span className="dark:text-gray-200">{slot}</span>
                          <button 
                            type="button" 
                            onClick={() => setPickupSlots(pickupSlots.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No time slots added. Use the input above.</p>
                  )}
                </div>
              )}

              <div className="pt-4">
                <button type="button" onClick={handleUpdateStoreSettings} disabled={storeSettingsLoading} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/30">
                  <Save size={18} /> {storeSettingsLoading ? 'Saving...' : 'Save All Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WARNINGS & REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-500" /> Store Warnings & Reviews
            </h2>
            
            {userInfo?.warningCount ? (
              <div className="mb-8 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-start gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-800 dark:text-red-200 font-bold text-lg mb-1">Warning Count: {userInfo.warningCount}</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your store has received official warnings from the admin. Too many warnings may result in account suspension. Please review customer complaints below and improve your service.
                  </p>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => <div key={n} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No reports yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't received any reviews or complaints.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((r: any) => (
                  <div key={r._id} className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          r.type === 'complaint'
                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                        }`}>
                          {r.type}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          r.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800' :
                          r.status === 'dismissed' ? 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-600' :
                          'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
                      "{r.message}"
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-3">
                      <span>Customer: <strong className="text-gray-700 dark:text-gray-300">{r.user?.name || 'Unknown'}</strong></span>
                      <span>Order: <strong className="text-gray-700 dark:text-gray-300">#{r.order?._id?.slice(-8).toUpperCase()}</strong></span>
                      {r.rating && <span>Rating: <strong className="text-yellow-500">{r.rating}/5</strong></span>}
                    </div>
                    {r.adminNotes && (
                      <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 mb-1">Admin Response</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">{r.adminNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) deleteProduct(productToDelete);
        }}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Yes, Delete Product"
        isDanger={true}
      />
    </div>
  );
}
