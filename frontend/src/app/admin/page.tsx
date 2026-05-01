'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, TrendingUp, DollarSign, ShieldCheck, Ban, Check, X, Eye, Store, Clock, AlertCircle, History, MessageSquare, LogOut } from 'lucide-react';
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
  
  // Base URL config
  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';


  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!userInfo && !token) {
      router.push('/login');
    } else if (userInfo && userInfo.role !== 'admin') {
      router.push('/profile');
    } else {
      fetchData();
    }
  }, [userInfo, router]);

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

  const handleUserAction = async (userId: string, action: 'warning' | 'ban' | 'remove', userName: string) => {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.post(`/users/admin/${userId}/action`, { action });
      toast.success(`User ${action} successful`);
      recordAction(userName, action, `Applied ${action} to user`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const dismissReport = async (reportId: string, targetName: string) => {
    try {
      const notes = adminNotesInput[reportId] || '';
      await api.post(`/reports/admin/${reportId}/dismiss`, { adminNotes: notes });
      toast.success('Report dismissed');
      recordAction(targetName, 'dismiss_report', `Dismissed report with notes: ${notes}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dismiss report');
    }
  };

  const logoutAdmin = async () => {
    try {
      await api.post('/users/logout');
      localStorage.removeItem('token');
      useStore.getState().setUserInfo(null);
      router.push('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const approveSeller = async (id: string) => {
    try {
      await api.put(`/users/${id}/approve`);
      toast.success('Seller approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve seller');
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

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="flex justify-between items-start relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">Admin Control Panel</h1>
          <button onClick={logoutAdmin} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
            <LogOut size={18} /> Logout
          </button>
        </div>
        <p className="text-purple-200 relative z-10">Manage platform operations, users, and store metrics.</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {['overview', 'users', 'reports', 'orders'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all capitalize ${
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
                  <span className="font-bold dark:text-white">{stats.paidOrders} / {stats.totalOrders}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(stats.paidOrders/stats.totalOrders)*100 || 0}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm mt-4">
                  <span className="text-gray-500 dark:text-gray-400">Delivered</span>
                  <span className="font-bold dark:text-white">{stats.deliveredOrders} / {stats.totalOrders}</span>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold">Account Status</th>
                  <th className="px-6 py-4 font-bold">Warnings</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
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
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                      {u.warningCount || 0}
                    </td>
                    <td className="px-6 py-4 flex justify-end gap-2 flex-wrap max-w-[200px] ml-auto">
                      {u.role === 'seller' && !u.isApproved && (
                        <button onClick={() => approveSeller(u._id)} className="px-3 py-1 bg-green-50 text-green-600 rounded text-xs font-bold transition">Approve</button>
                      )}
                      {u._id !== userInfo?._id && u.account_status !== 'banned' && u.account_status !== 'removed' && (
                        <>
                          <button onClick={() => handleUserAction(u._id, 'warning', u.name)} className="px-3 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded text-xs font-bold transition">Warn</button>
                          <button onClick={() => handleUserAction(u._id, 'ban', u.name)} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition">Ban</button>
                          <button onClick={() => handleUserAction(u._id, 'remove', u.name)} className="px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs font-bold transition">Remove</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl mb-4 text-sm text-gray-800 dark:text-gray-200">
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
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-transparent dark:text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleUserAction(report.seller?._id, 'warning', report.seller?.name)} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200 transition">Issue Warning</button>
                      <button onClick={() => handleUserAction(report.seller?._id, 'ban', report.seller?.name)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition">Ban User</button>
                      <button onClick={() => handleUserAction(report.seller?._id, 'remove', report.seller?.name)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition">Remove User</button>
                      <button onClick={() => dismissReport(report._id, report.seller?.name)} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition">Dismiss Report</button>
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
                    <td className="px-6 py-4 font-medium dark:text-white">{o.user?.name || 'Deleted User'}</td>
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
