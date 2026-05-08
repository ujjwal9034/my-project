'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import Link from 'next/link';
import { User, Mail, MapPin, Phone, Lock, Package, Trash2, Edit3, Settings, ShieldAlert, CreditCard, ChevronRight, ShoppingBag, Truck, Store, ReceiptText, IndianRupee, Check, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ConfirmationModal';

// ── Status badge helper ────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  'Pending':          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'Packed':           'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  'Shipped':          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'Delivered':        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  'Ready for Pickup': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'Picked Up':        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  'Cancelled':        'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {status}
    </span>
  );
}

export default function Profile() {
  const { userInfo, setUserInfo, hiddenOrderIds, hideOrder, selectedAddressId, setSelectedAddressId } = useStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile'|'orders'|'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  // Profile Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Address
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const initialAddressState = { _id: '', label: '', fullName: '', phone: '', houseNo: '', area: '', landmark: '', address: '', city: '', postalCode: '' };
  const [newAddress, setNewAddress] = useState(initialAddressState);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!userInfo) {
      const timer = setTimeout(() => {
        if (!useStore.getState().userInfo) {
          router.push('/login');
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setName(userInfo.name || '');
      setEmail(userInfo.email || '');
      setPhone(userInfo.phone || '');
      setTwoFactorEnabled(userInfo.twoFactorEnabled || false);
      fetchProfileData();
    }
  }, [userInfo, router, isMounted]);

  const fetchProfileData = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setAddresses(data.addresses || []);
    } catch (error) {
      console.error(error);
    }

    try {
      setOrdersLoading(true);
      const { data: orderData } = await api.get('/orders/myorders');
      setOrders(orderData);
    } catch (error) {
      console.error(error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'Cancelled' });
      toast.success('Order cancelled successfully');
      fetchProfileData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', { name, email, phone, twoFactorEnabled });
      setUserInfo(data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/users/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(newAddress.phone)) {
      toast.error('Phone number must be 10 digits');
      return;
    }
    if (!/^\d{6}$/.test(newAddress.postalCode)) {
      toast.error('Pincode must be 6 digits');
      return;
    }

    try {
      if (newAddress._id) {
        const { data } = await api.put(`/users/addresses/${newAddress._id}`, newAddress);
        setAddresses(data);
        toast.success('Address updated');
      } else {
        const { data } = await api.post('/users/addresses', newAddress);
        setAddresses(data);
        toast.success('Address added');
      }
      setShowAddressForm(false);
      setNewAddress(initialAddressState);
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const { data } = await api.delete(`/users/addresses/${id}`);
      setAddresses(data);
      toast.success('Address removed');
    } catch (error) {
      toast.error('Failed to remove address');
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm');
      return;
    }
    setLoading(true);
    try {
      await api.delete('/users/profile', { data: { password: deletePassword } });
      setUserInfo(null);
      router.push('/');
      toast.success('Account deleted forever. We are sad to see you go.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  if (!userInfo) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-center bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {userInfo.name[0].toUpperCase()}
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{userInfo.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-start gap-1 mt-1">
            <Mail size={16} /> {userInfo.email}
          </p>
        </div>
        <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-bold uppercase tracking-wider text-sm border border-green-200 dark:border-green-800">
          {userInfo.role}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'profile' ? 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <User size={20} /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'orders' ? 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3"><Package size={20} /> Order History</div>
            {orders.length > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'orders' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>{orders.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'security' ? 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <ShieldAlert size={20} /> Security Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-green-500" /> Basic Details
                    </h2>
                    <form onSubmit={updateProfile} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                        </div>
                      </div>
                      <button disabled={loading} type="submit" className="bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 transition disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </form>
                  </div>

                  {/* Address Book */}
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin size={20} className="text-green-500" /> Address Book
                      </h2>
                      {!showAddressForm && (
                        <button onClick={() => setShowAddressForm(true)} className="text-sm font-bold text-green-600 dark:text-green-400 hover:underline">
                          + Add New
                        </button>
                      )}
                    </div>

                    {showAddressForm && (
                      <form onSubmit={saveAddress} className="mb-6 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <input type="text" placeholder="Address Label (e.g. Home, Work)" value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="Full Name" value={newAddress.fullName} onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="tel" placeholder="Phone Number (10 digits)" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="House / Flat No." value={newAddress.houseNo} onChange={e => setNewAddress({...newAddress, houseNo: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="Area / Street" value={newAddress.area} onChange={e => setNewAddress({...newAddress, area: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="Landmark (Optional)" value={newAddress.landmark} onChange={e => setNewAddress({...newAddress, landmark: e.target.value})} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="City" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="Pincode (6 digits)" value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})} required className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-green-700 text-sm">Save</button>
                          <button type="button" onClick={() => { setShowAddressForm(false); setNewAddress(initialAddressState); }} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white font-bold py-2 px-6 rounded-xl text-sm hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        </div>
                      </form>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addresses.length === 0 && !showAddressForm ? (
                        <div className="text-center py-8 col-span-2 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
                          <MapPin size={32} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No addresses saved yet.</p>
                          <button onClick={() => setShowAddressForm(true)} className="mt-3 text-sm font-bold text-green-600 dark:text-green-400 hover:underline">Add your first address</button>
                        </div>
                      ) : (
                        addresses.map((addr) => (
                          <div 
                            key={addr._id} 
                            onClick={() => setSelectedAddressId(addr._id)}
                            className={`p-5 rounded-2xl relative group cursor-pointer transition-all border-2 ${
                              selectedAddressId === addr._id 
                                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10 shadow-sm' 
                                : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-700'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-extrabold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md">{addr.label}</span>
                              {selectedAddressId === addr._id && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check size={12} /> Selected
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white mt-2">{addr.fullName || userInfo?.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.area ? `${addr.area}` : addr.address}
                            </p>
                            {addr.landmark && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Landmark: {addr.landmark}</p>}
                            <p className="text-sm text-gray-600 dark:text-gray-300">{addr.city}, {addr.postalCode}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">{addr.phone || userInfo?.phone}</p>
                            
                            <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewAddress({
                                    _id: addr._id,
                                    label: addr.label,
                                    fullName: addr.fullName || '',
                                    phone: addr.phone || '',
                                    houseNo: addr.houseNo || '',
                                    area: addr.area || '',
                                    landmark: addr.landmark || '',
                                    address: addr.address || '',
                                    city: addr.city,
                                    postalCode: addr.postalCode
                                  });
                                  setShowAddressForm(true);
                                }} 
                                className="p-1.5 bg-white dark:bg-gray-700 shadow-sm rounded-lg text-gray-400 hover:text-blue-500 transition"
                                title="Edit Address"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteAddress(addr._id); }} 
                                className="p-1.5 bg-white dark:bg-gray-700 shadow-sm rounded-lg text-gray-400 hover:text-red-500 transition"
                                title="Delete Address"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ORDERS TAB */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  {ordersLoading ? (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                      {[1,2,3].map(n => <div key={n} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : (() => {
                    // Filter out soft-deleted orders
                    const visibleOrders = orders.filter(o => !hiddenOrderIds.includes(o._id));

                    if (visibleOrders.length === 0) {
                      return (
                        <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag size={36} className="text-green-400" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No orders yet</h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven&apos;t placed any orders. Start exploring fresh products!</p>
                          <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-700 transition"
                          >
                            <Store size={18} /> Browse Stores
                          </Link>
                        </div>
                      );
                    }

                    // ── Summary bar ─────────────────────────────────────────────
                    const totalSpent = visibleOrders.reduce((sum, o) => sum + o.totalPrice, 0);

                    // ── Group by seller name ────────────────────────────────────
                    // Each order may contain items from one seller; use first item's seller id as group key
                    // (seller name comes as populated field; fall back to seller ID)
                    const grouped: Record<string, { sellerName: string; orders: any[] }> = {};
                    visibleOrders.forEach((order) => {
                      const firstItem = order.orderItems?.[0];
                      const sellerId: string = firstItem?.seller?._id ?? firstItem?.seller ?? 'unknown';
                      const sellerName: string = firstItem?.seller?.storeName || 'Unnamed Store';
                      if (!grouped[sellerId]) grouped[sellerId] = { sellerName, orders: [] };
                      grouped[sellerId].orders.push(order);
                    });

                    return (
                      <>
                        {/* Summary Bar */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Package size={22} className="text-blue-500" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
                              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{visibleOrders.length}</p>
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                              <IndianRupee size={22} className="text-green-500" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</p>
                              <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">₹{totalSpent.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Orders grouped by store */}
                        {Object.entries(grouped).map(([sellerId, group]) => (
                          <div key={sellerId} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            {/* Store header */}
                            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                              <Store size={18} className="text-green-500 flex-shrink-0" />
                              <span className="font-bold text-gray-800 dark:text-white text-sm">{group.sellerName}</span>
                              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{group.orders.length} order{group.orders.length !== 1 ? 's' : ''}</span>
                            </div>

                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                              {group.orders.map((order, orderIdx) => (
                                <motion.div
                                  key={order._id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: orderIdx * 0.04 }}
                                  className="p-5 sm:p-6"
                                >
                                  {/* Order meta row */}
                                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                          Order #{orderIdx + 1} &mdash; <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{order._id.slice(-8).toUpperCase()}</span>
                                        </span>
                                        <StatusBadge status={order.status} />
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                                        <span className={`inline-flex items-center gap-1 font-semibold ${
                                          order.deliveryType === 'Pickup' ? 'text-purple-500' : 'text-blue-500'
                                        }`}>
                                          <Truck size={12} />
                                          {order.deliveryType === 'Pickup' ? 'Local Pickup' : 'Home Delivery'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Delete (soft) + View link */}
                                    <div className="flex items-center gap-2">
                                      {order.status === 'Pending' && (
                                        <button
                                          onClick={() => setCancelModalOrderId(order._id)}
                                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition mr-2"
                                        >
                                          Cancel Order
                                        </button>
                                      )}
                                      <Link
                                        href={`/order/${order._id}`}
                                        className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                      >
                                        View <ChevronRight size={13} />
                                      </Link>
                                      <button
                                        onClick={() => {
                                          hideOrder(order._id);
                                          toast.success('Order removed from your history');
                                        }}
                                        title="Remove from my history"
                                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Items table */}
                                  <div className="space-y-2 mb-4">
                                    {order.orderItems.map((item: any, i: number) => (
                                      <div key={i} className="flex items-center justify-between gap-3 text-sm bg-gray-50 dark:bg-gray-700/40 px-4 py-2.5 rounded-xl">
                                        <span className="text-gray-700 dark:text-gray-200 font-medium flex-1 truncate">{item.name}</span>
                                        <span className="text-gray-400 text-xs whitespace-nowrap">{item.qty} × ₹{item.price.toFixed(2)}</span>
                                        <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">₹{(item.qty * item.price).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Totals row */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex gap-4">
                                      {order.shippingPrice > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Truck size={12} /> Delivery fee: <strong className="text-gray-700 dark:text-gray-200">₹{order.shippingPrice.toFixed(2)}</strong>
                                        </span>
                                      )}
                                      {order.shippingPrice === 0 && order.deliveryType !== 'Pickup' && (
                                        <span className="text-green-500 font-semibold">Free delivery</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 font-extrabold text-base text-gray-900 dark:text-white">
                                      <ReceiptText size={14} className="text-gray-400" />
                                      Total: <span className="text-green-600 dark:text-green-400 ml-1">₹{order.totalPrice.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                      <Shield size={20} className="text-blue-500" /> Security Settings
                    </h2>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Receive a code via email when signing in.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={twoFactorEnabled}
                          onChange={(e) => {
                            setTwoFactorEnabled(e.target.checked);
                            api.put('/users/profile', { twoFactorEnabled: e.target.checked }).then(({data}) => {
                              setUserInfo(data);
                              toast.success(`2FA ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                            }).catch(() => {
                              setTwoFactorEnabled(!e.target.checked);
                              toast.error('Failed to update 2FA setting');
                            });
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Password Change */}
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                      <Lock size={20} className="text-gray-500" /> Change Password
                    </h2>
                    <form onSubmit={changePassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                      </div>
                      <button disabled={loading} type="submit" className="bg-gray-900 dark:bg-gray-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition disabled:opacity-50">
                        {loading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-100 dark:border-red-900/50 relative overflow-hidden">
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
                      <p className="text-red-500/80 dark:text-red-400/80 text-sm mb-6">Once you delete your account, there is no going back. Please be certain.</p>
                      
                      {!showDeleteModal ? (
                        <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200 dark:shadow-red-900/20">
                          Delete My Account
                        </button>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-red-200 dark:border-red-900 shadow-xl max-w-md mt-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                            <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">This action cannot be undone. All your data, orders, and addresses will be permanently removed.</p>
                          <input 
                            type="password" 
                            placeholder="Enter your password to confirm" 
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 mb-4 outline-none transition"
                          />
                          <div className="flex gap-3">
                            <button onClick={deleteAccount} disabled={loading || !deletePassword} className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition disabled:opacity-50">
                              {loading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} className="px-6 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ConfirmationModal
        isOpen={!!cancelModalOrderId}
        onClose={() => setCancelModalOrderId(null)}
        onConfirm={() => {
          if (cancelModalOrderId) cancelOrder(cancelModalOrderId);
        }}
        title="Cancel Order"
        message="Are you sure you want to cancel this pending order? This action cannot be undone."
        confirmText="Yes, Cancel Order"
        isDanger={true}
      />
    </div>
  );
}
