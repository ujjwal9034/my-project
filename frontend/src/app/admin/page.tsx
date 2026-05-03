'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api, { getImageUrl } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ShoppingBag, TrendingUp, DollarSign, ShieldCheck, Ban, Check, X, Eye, Store, Clock, AlertCircle, History, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminDashboard() {
  const { userInfo } = useStore();
  const router = useRouter();
  
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'reports'>('overview');
  const [reports, setReports] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [adminNotesInput, setAdminNotesInput] = useState<{ [id: string]: string }>({});
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; userId: string; action: 'warning' | 'ban' | 'unban' | 'remove' | 'delete' | 'verify_kyc' | 'reject_kyc' | 'undo_kyc' | null; userName: string; }>({ isOpen: false, userId: '', action: null, userName: '' });
  const [userSearch, setUserSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Base URL config
  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!userInfo && !token) {
      const timer = setTimeout(() => {
        if (!useStore.getState().userInfo && !localStorage.getItem('token')) {
          router.push('/login');
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (userInfo && userInfo.role !== 'admin') {
      router.push('/profile');
    } else if (userInfo && userInfo.role === 'admin') {
      fetchData();
    }
  }, [userInfo, router, isMounted]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Attach token if needed
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const [statsRes, usersRes, ordersRes, reportsRes] = await Promise.all([
        api.get('/users/admin/stats'),
        api.get('/users'),
        api.get('/orders'),
        api.get('/reports'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setOrders(ordersRes.data);
      setReports(reportsRes.data);
      
      const actions = localStorage.getItem('adminRecentActions');
      if (actions) setRecentActions(JSON.parse(actions));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };


  const recordAction = (targetUser: string, actionType: string, notes: string) => {
    const newAction = { targetUser, actionType, notes, timestamp: new Date().toISOString() };
    const updated = [newAction, ...recentActions].slice(0, 50);
    setRecentActions(updated);
    localStorage.setItem('adminRecentActions', JSON.stringify(updated));
  };

  const handleUserAction = async (userId: string, action: 'warning' | 'ban' | 'unban' | 'remove' | 'verify_kyc' | 'reject_kyc' | 'undo_kyc', userName: string) => {
    setActionLoadingId(userId);
    try {
      await api.post(`/users/admin/${userId}/action`, { action });
      toast.success(`User ${action.replace('_', ' ')} successful`);
      recordAction(userName, action, `Applied ${action} to user`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const dismissReport = async (reportId: string, targetName: string) => {
    setActionLoadingId(reportId);
    try {
      const notes = adminNotesInput[reportId] || '';
      await api.post(`/reports/admin/${reportId}/dismiss`, { adminNotes: notes });
      toast.success('Report dismissed');
      recordAction(targetName, 'dismiss_report', `Dismissed report with notes: ${notes}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dismiss report');
    } finally {
      setActionLoadingId(null);
    }
  };

  const approveSeller = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.put(`/users/${id}/approve`);
      toast.success('Seller approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve seller');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleBan = async (id: string) => {
    try {
      const { data } = await api.put(`/users/${id}/ban`);
      toast.success(data.message);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const deleteUser = async (id: string, name: string) => {
    setActionLoadingId(id);
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      recordAction(name, 'delete', 'Permanently deleted user');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmAction = () => {
    if (!actionModal.action) return;
    
    if (actionModal.action === 'delete') {
      deleteUser(actionModal.userId, actionModal.userName);
    } else {
      handleUserAction(actionModal.userId, actionModal.action, actionModal.userName);
    }
    setActionModal({ isOpen: false, userId: '', action: null, userName: '' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 sm:mb-2">Admin Control Panel</h1>
          <p className="text-purple-200 text-sm sm:text-base">Manage platform operations, users, and store metrics.</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto scrollbar-hide">
        {['overview', 'users', 'reports', 'orders'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all capitalize whitespace-nowrap ${
              activeTab === tab ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<DollarSign size={24}/>} title="Total Revenue" value={`₹${stats.totalRevenue.toFixed(2)}`} color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
            <StatCard icon={<ShoppingBag size={24}/>} title="Total Orders" value={stats.totalOrders} color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard icon={<Users size={24}/>} title="Customers" value={stats.totalCustomers} color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            <StatCard icon={<Store size={24}/>} title="Active Sellers" value={stats.totalSellers} color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
            <StatCard icon={<AlertCircle size={24}/>} title="Pending Reports" value={stats.pendingReports} color="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
            <StatCard icon={<Ban size={24}/>} title="Banned Users" value={stats.bannedUsers} color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            <StatCard icon={<X size={24}/>} title="Removed Users" value={stats.removedUsers} color="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400" />

          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-500" /> Order Fulfillment
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total Paid</span>
                  <span className="font-bold text-gray-900 dark:text-white">{stats.paidOrders} / {stats.totalOrders}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(stats.paidOrders/stats.totalOrders)*100 || 0}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm mt-4">
                  <span className="text-gray-500 dark:text-gray-400">Delivered</span>
                  <span className="font-bold text-gray-900 dark:text-white">{stats.deliveredOrders} / {stats.totalOrders}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stats.deliveredOrders/stats.totalOrders)*100 || 0}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-yellow-500" /> Pending Approvals
              </h3>
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <div>
                  <p className="text-yellow-800 dark:text-yellow-500 font-bold text-2xl">{stats.pendingSellers}</p>
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">Sellers waiting for approval</p>
                </div>
                {stats.pendingSellers > 0 && (
                  <button onClick={() => setActiveTab('users')} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-600 transition">
                    Review Now
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MONTHLY REVENUE CHART */}
          {stats.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-500" /> Monthly Revenue
              </h3>
              <div className="flex items-end gap-3 h-48">
                {(() => {
                  const maxRev = Math.max(...stats.monthlyRevenue.map((m: any) => m.revenue), 1);
                  return stats.monthlyRevenue.map((m: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">₹{m.revenue >= 1000 ? `${(m.revenue/1000).toFixed(1)}k` : m.revenue.toFixed(0)}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(m.revenue / maxRev) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-t-lg min-h-[4px]"
                      />
                      <span className="text-[10px] font-semibold text-gray-400">{m._id.slice(5)}</span>
                      <span className="text-[9px] text-gray-400">{m.orders} orders</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* PER-STORE REVENUE */}
          {orders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Store size={20} className="text-indigo-500" /> Revenue by Store
              </h3>
              <div className="space-y-3">
                {(() => {
                  const storeRevenue: { [k: string]: { name: string; revenue: number; orders: number } } = {};
                  orders.forEach((o: any) => {
                    o.orderItems?.forEach((item: any) => {
                      const sellerId = item.seller || 'unknown';
                      if (!storeRevenue[sellerId]) storeRevenue[sellerId] = { name: item.sellerName || 'Store', revenue: 0, orders: 0 };
                      storeRevenue[sellerId].revenue += item.qty * item.price;
                    });
                    const firstSeller = o.orderItems?.[0]?.seller || 'unknown';
                    if (storeRevenue[firstSeller]) storeRevenue[firstSeller].orders += 1;
                  });
                  const stores = Object.values(storeRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
                  const maxRev = Math.max(...stores.map(s => s.revenue), 1);
                  return stores.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">{s.name}</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400 ml-2">₹{s.revenue.toFixed(0)}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(s.revenue / maxRev) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{s.orders} orders</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* RECENT ACTIONS */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History size={20} className="text-blue-500" /> Recent Admin Actions
            </h3>
            <div className="space-y-3">
              {recentActions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent actions.</p>
              ) : (
                recentActions.slice(0, 10).map((act, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                    <div>
                      <span className="font-bold text-gray-800 dark:text-white mr-2">{act.targetUser}</span>
                      <span className="uppercase text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">{act.actionType}</span>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">{act.notes}</p>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 sm:mt-0">
                      {new Date(act.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </motion.div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm"
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Warnings</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          u.role === 'seller' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                          u.account_status === 'banned' ? 'bg-red-100 text-red-700' :
                          u.account_status === 'removed' ? 'bg-gray-200 text-gray-700' :
                          u.account_status === 'warned' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {u.account_status || (u.isBanned ? 'banned' : 'active')}
                        </span>
                        {u.banReason && <div className="text-xs text-red-500 mt-1">Reason: {u.banReason}</div>}
                        {u.role === 'seller' && u.kycStatus === 'pending' && u.kycDocument && (
                          <div className="mt-2 text-[10px]">
                            <a href={getImageUrl(u.kycDocument)} target="_blank" rel="noreferrer" className="text-blue-500 underline">View KYC Doc</a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                        {u.warningCount || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {u.role === 'seller' && !u.isApproved && (
                            <button disabled={actionLoadingId === u._id} onClick={() => approveSeller(u._id)} className="px-3 py-1 bg-green-50 text-green-600 rounded text-xs font-bold transition disabled:opacity-50">{actionLoadingId === u._id ? 'Approving...' : 'Approve'}</button>
                          )}
                          {u.role === 'seller' && u.kycStatus === 'pending' && (
                            <>
                              <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'verify_kyc', userName: u.name })} className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition">Verify KYC</button>
                              <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'reject_kyc', userName: u.name })} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition">Reject KYC</button>
                            </>
                          )}
                          {u.role === 'seller' && (u.kycStatus === 'verified' || u.kycStatus === 'rejected') && (
                            <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'undo_kyc', userName: u.name })} className="px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-200 rounded text-xs font-bold transition">Undo KYC</button>
                          )}
                          {u._id !== userInfo?._id && u.account_status !== 'banned' && u.account_status !== 'removed' && !u.isBanned && (
                            <>
                              <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'warning', userName: u.name })} className="px-3 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded text-xs font-bold transition">Warn</button>
                              <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'ban', userName: u.name })} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition">Ban</button>
                              <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'remove', userName: u.name })} className="px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs font-bold transition">Remove</button>
                            </>
                          )}
                          {u._id !== userInfo?._id && (u.account_status === 'banned' || u.isBanned) && u.account_status !== 'removed' && (
                            <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'unban', userName: u.name })} className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-bold transition">Unban</button>
                          )}
                          {u._id !== userInfo?._id && (
                            <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'delete', userName: u.name })} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold transition">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map((u) => (
              <div key={u._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    u.role === 'seller' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {u.role}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2.5 py-1 rounded-md font-bold uppercase ${
                    u.account_status === 'banned' ? 'bg-red-100 text-red-700' :
                    u.account_status === 'removed' ? 'bg-gray-200 text-gray-700' :
                    u.account_status === 'warned' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {u.account_status || (u.isBanned ? 'banned' : 'active')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">Warnings: <strong className="text-gray-900 dark:text-white">{u.warningCount || 0}</strong></span>
                </div>
                {u.banReason && <p className="text-xs text-red-500">Reason: {u.banReason}</p>}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  {u.role === 'seller' && !u.isApproved && (
                    <button disabled={actionLoadingId === u._id} onClick={() => approveSeller(u._id)} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold transition disabled:opacity-50">{actionLoadingId === u._id ? 'Approving...' : 'Approve'}</button>
                  )}
                  {u.role === 'seller' && u.kycStatus === 'pending' && (
                    <>
                      <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'verify_kyc', userName: u.name })} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition">Verify KYC</button>
                      <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'reject_kyc', userName: u.name })} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">Reject KYC</button>
                    </>
                  )}
                  {u._id !== userInfo?._id && u.account_status !== 'banned' && u.account_status !== 'removed' && !u.isBanned && (
                    <>
                      <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'warning', userName: u.name })} className="px-3 py-1.5 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg text-xs font-bold transition">Warn</button>
                      <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'ban', userName: u.name })} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">Ban</button>
                      <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'remove', userName: u.name })} className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-bold transition">Remove</button>
                    </>
                  )}
                  {u._id !== userInfo?._id && (u.account_status === 'banned' || u.isBanned) && u.account_status !== 'removed' && (
                    <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'unban', userName: u.name })} className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition">Unban</button>
                  )}
                  {u._id !== userInfo?._id && (
                    <button onClick={() => setActionModal({ isOpen: true, userId: u._id, action: 'delete', userName: u.name })} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      
      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {reports.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <ShieldCheck size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg text-gray-500 dark:text-gray-400">No pending reports.</p>
            </div>
          ) : (
            reports.map((report: any) => (
              <div key={report._id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50 dark:border-gray-700">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase mr-3 ${
                      report.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>{report.type}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>{report.status}</span>
                    
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Reporter:</strong> {report.user?.name} (Customer)
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Target:</strong> {report.seller?.name} (Store: {report.seller?.storeName})
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Order #{report.order?._id.slice(-8)} • {new Date(report.createdAt).toLocaleString()}</p>
                  </div>
                  {report.rating && (
                    <div className="bg-yellow-50 text-yellow-700 font-bold px-3 py-1 rounded-lg text-sm">
                      ★ {report.rating} / 5
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl mb-4 text-sm text-gray-800 text-gray-700 dark:text-gray-200">
                  "{report.message}"
                </div>

                {report.status !== 'pending' && report.adminNotes && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                    <strong>Resolution Notes:</strong> {report.adminNotes}
                  </div>
                )}

                {report.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-50 dark:border-gray-700">
                    <input
                      type="text"
                      placeholder="Admin Notes..."
                      value={adminNotesInput[report._id] || ''}
                      onChange={(e) => setAdminNotesInput({...adminNotesInput, [report._id]: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setActionModal({ isOpen: true, userId: report.seller?._id, action: 'warning', userName: report.seller?.name })} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200 transition">Issue Warning</button>
                      <button onClick={() => setActionModal({ isOpen: true, userId: report.seller?._id, action: 'ban', userName: report.seller?.name })} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition">Ban User</button>
                      <button onClick={() => setActionModal({ isOpen: true, userId: report.seller?._id, action: 'remove', userName: report.seller?.name })} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition">Remove User</button>
                      <button disabled={actionLoadingId === report._id} onClick={() => dismissReport(report._id, report.seller?.name)} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition disabled:opacity-50">
                        {actionLoadingId === report._id ? 'Dismissing...' : 'Dismiss Report'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* ORDERS TAB */}

      {activeTab === 'orders' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Order ID</th>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 font-mono text-xs">{o._id.slice(-8)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{o.user?.name || 'Deleted User'}</td>
                    <td className="px-6 py-4 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">₹{o.totalPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                        o.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        o.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/order/${o._id}`} className="text-indigo-600 hover:underline flex items-center gap-1 text-xs font-bold">
                        View <Eye size={14}/>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ACTION MODAL */}
      <AnimatePresence>
        {actionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className={`p-6 ${
                actionModal.action === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' :
                actionModal.action === 'unban' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                actionModal.action === 'verify_kyc' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                actionModal.action === 'undo_kyc' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600' :
                'bg-red-50 dark:bg-red-900/20 text-red-600'
              }`}>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <AlertCircle size={24} /> Confirm Action
                  </h3>
                  <button onClick={() => setActionModal({ isOpen: false, userId: '', action: null, userName: '' })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Are you sure you want to <strong>{actionModal.action === 'verify_kyc' ? 'verify KYC for' : actionModal.action === 'reject_kyc' ? 'reject KYC for' : actionModal.action === 'undo_kyc' ? 'undo KYC for' : actionModal.action}</strong> user <span className="font-bold text-gray-900 dark:text-white">"{actionModal.userName}"</span>? 
                  {actionModal.action === 'delete' && " This action is irreversible and will permanently destroy all their data."}
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setActionModal({ isOpen: false, userId: '', action: null, userName: '' })}
                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmAction}
                    className={`px-5 py-2.5 rounded-xl font-bold text-white transition shadow-lg ${
                      actionModal.action === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20' :
                      actionModal.action === 'unban' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' :
                      actionModal.action === 'verify_kyc' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' :
                      actionModal.action === 'undo_kyc' ? 'bg-gray-600 hover:bg-gray-700 shadow-gray-600/20' :
                      'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    }`}
                  >
                    Yes, {actionModal.action === 'warning' ? 'Warn' : actionModal.action === 'unban' ? 'Unban' : actionModal.action === 'delete' ? 'Delete' : actionModal.action === 'remove' ? 'Remove' : actionModal.action === 'verify_kyc' ? 'Verify KYC for' : actionModal.action === 'reject_kyc' ? 'Reject KYC for' : actionModal.action === 'undo_kyc' ? 'Undo KYC for' : 'Ban'} User
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function StatCard({ icon, title, value, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
