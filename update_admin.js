const fs = require('fs');

const path = 'frontend/src/app/admin/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add lucide imports
code = code.replace(
  `import { Users, ShoppingBag, TrendingUp, DollarSign, ShieldCheck, Ban, Check, X, Eye, Store, Clock } from 'lucide-react';`,
  `import { Users, ShoppingBag, TrendingUp, DollarSign, ShieldCheck, Ban, Check, X, Eye, Store, Clock, AlertCircle, History, MessageSquare, LogOut } from 'lucide-react';`
);

// 2. Update activeTab state and add reports/recentActions states
code = code.replace(
  `  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders'>('overview');`,
  `  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'reports'>('overview');
  const [reports, setReports] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [adminNotesInput, setAdminNotesInput] = useState<{ [id: string]: string }>({});
  
  // Base URL config
  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
`
);

// 3. Update useEffect and API Auth
code = code.replace(
  `    if (!userInfo) {
      router.push('/login');
    } else if (userInfo.role !== 'admin') {`,
  `    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!userInfo && !token) {
      router.push('/login');
    } else if (userInfo && userInfo.role !== 'admin') {`
);

// 4. Update fetchData
code = code.replace(
  `        api.get('/users'),
        api.get('/orders'),`,
  `        api.get('/users'),
        api.get('/orders'),
        api.get('/reports'),`
);
code = code.replace(
  `      const [statsRes, usersRes, ordersRes] = await Promise.all([`,
  `      // Attach token if needed
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
      }
      
      const [statsRes, usersRes, ordersRes, reportsRes] = await Promise.all([`
);
code = code.replace(
  `      setUsers(usersRes.data);
      setOrders(ordersRes.data);`,
  `      setUsers(usersRes.data);
      setOrders(ordersRes.data);
      setReports(reportsRes.data);
      
      const actions = localStorage.getItem('adminRecentActions');
      if (actions) setRecentActions(JSON.parse(actions));`
);

// 5. Add action handlers
const handlers = `
  const recordAction = (targetUser: string, actionType: string, notes: string) => {
    const newAction = { targetUser, actionType, notes, timestamp: new Date().toISOString() };
    const updated = [newAction, ...recentActions].slice(0, 50);
    setRecentActions(updated);
    localStorage.setItem('adminRecentActions', JSON.stringify(updated));
  };

  const handleUserAction = async (userId: string, action: 'warning' | 'ban' | 'remove', userName: string) => {
    if (!confirm(\`Are you sure you want to \${action} this user?\`)) return;
    try {
      await api.post(\`/users/admin/\${userId}/action\`, { action });
      toast.success(\`User \${action} successful\`);
      recordAction(userName, action, \`Applied \${action} to user\`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || \`Failed to \${action} user\`);
    }
  };

  const dismissReport = async (reportId: string, targetName: string) => {
    try {
      const notes = adminNotesInput[reportId] || '';
      await api.post(\`/reports/admin/\${reportId}/dismiss\`, { adminNotes: notes });
      toast.success('Report dismissed');
      recordAction(targetName, 'dismiss_report', \`Dismissed report with notes: \${notes}\`);
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
`;
code = code.replace(`  const approveSeller = async (id: string) => {`, handlers + `\n  const approveSeller = async (id: string) => {`);

// 6. Header
code = code.replace(
  `<h1 className="text-3xl font-extrabold mb-2 relative z-10">Admin Control Panel</h1>`,
  `<div className="flex justify-between items-start relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">Admin Control Panel</h1>
          <button onClick={logoutAdmin} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
            <LogOut size={18} /> Logout
          </button>
        </div>`
);

// Nav
code = code.replace(
  `{['overview', 'users', 'orders'].map((tab) => (`,
  `{['overview', 'users', 'reports', 'orders'].map((tab) => (`
);

// Overview Stats (add 3 new cards)
const newStats = `
            <StatCard icon={<AlertCircle size={24}/>} title="Pending Reports" value={stats.pendingReports} color="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
            <StatCard icon={<Ban size={24}/>} title="Banned Users" value={stats.bannedUsers} color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            <StatCard icon={<X size={24}/>} title="Removed Users" value={stats.removedUsers} color="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400" />
`;
code = code.replace(
  `<StatCard icon={<Store size={24}/>} title="Active Sellers" value={stats.totalSellers} color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />`,
  `<StatCard icon={<Store size={24}/>} title="Active Sellers" value={stats.totalSellers} color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />` + newStats
);

// Add Recent Actions to Overview
const recentActionsHTML = `
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
`;
code = code.replace(
  `          </div>
        </motion.div>
      )}

      {/* USERS TAB */}`,
  `          </div>` + recentActionsHTML + `
        </motion.div>
      )}

      {/* USERS TAB */}`
);

// Update Users Tab Table
code = code.replace(
  `<th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>`,
  `<th className="px-6 py-4 font-bold">Account Status</th>
                  <th className="px-6 py-4 font-bold">Warnings</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>`
);
code = code.replace(
  `<td className="px-6 py-4">
                      {u.isBanned ? (
                        <span className="text-red-500 font-bold flex items-center gap-1 text-xs"><Ban size={14}/> Banned</span>
                      ) : u.role === 'seller' && !u.isApproved ? (
                        <span className="text-yellow-500 font-bold flex items-center gap-1 text-xs"><Clock size={14}/> Pending Approval</span>
                      ) : (
                        <span className="text-green-500 font-bold flex items-center gap-1 text-xs"><Check size={14}/> Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex justify-end gap-2">
                      {u.role === 'seller' && !u.isApproved && (
                        <button onClick={() => approveSeller(u._id)} className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 hover:bg-green-100 rounded-lg transition" title="Approve Seller">
                          <Check size={16}/>
                        </button>
                      )}
                      {u._id !== userInfo?._id && (
                        <>
                          <button onClick={() => toggleBan(u._id)} className="p-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 hover:bg-yellow-100 rounded-lg transition" title={u.isBanned ? 'Unban' : 'Ban'}>
                            {u.isBanned ? <Check size={16}/> : <Ban size={16}/>}
                          </button>
                          <button onClick={() => deleteUser(u._id)} className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 rounded-lg transition" title="Delete User">
                            <X size={16}/>
                          </button>
                        </>
                      )}
                    </td>`,
  `<td className="px-6 py-4">
                      <span className={\`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase \${
                        u.account_status === 'banned' ? 'bg-red-100 text-red-700' :
                        u.account_status === 'removed' ? 'bg-gray-200 text-gray-700' :
                        u.account_status === 'warned' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }\`}>
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
                    </td>`
);

// Add Reports Tab UI before ORDERS TAB
const reportsHTML = `
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
                    <span className={\`px-3 py-1 rounded-full text-xs font-bold uppercase mr-3 \${
                      report.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }\`}>{report.type}</span>
                    <span className={\`px-3 py-1 rounded-full text-xs font-bold uppercase \${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }\`}>{report.status}</span>
                    
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
`;
code = code.replace(`{/* ORDERS TAB */}`, reportsHTML);

fs.writeFileSync(path, code);
console.log('Successfully updated admin dashboard');
