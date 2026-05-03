'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, AlertCircle, Star, Clock, CheckCircle2, XCircle,
  MessageSquare, ShoppingBag, ChevronDown, ChevronUp, Send, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { cls: string; icon: React.ReactNode }> = {
  pending:   { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: <Clock size={11} /> },
  resolved:  { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',   icon: <CheckCircle2 size={11} /> },
  dismissed: { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600',              icon: <XCircle size={11} /> },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${s.cls}`}>
      {s.icon} {status}
    </span>
  );
}

// ── Star rating display ───────────────────────────────────────────────────────
function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
        />
      ))}
    </span>
  );
}

// ── Star rating input ─────────────────────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition"
        >
          <Star
            size={22}
            className={
              n <= (hovered || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 text-xs text-gray-400 font-medium">{value}/5</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { userInfo } = useStore();
  const router = useRouter();

  const [tab, setTab] = useState<'history' | 'new'>('history');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Form state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [form, setForm] = useState({ orderId: '', type: 'complaint', message: '', rating: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userInfo) { router.push('/login'); return; }
    fetchReports();
  }, [userInfo, router]);

  // Fetch orders only when "New Report" tab is opened
  useEffect(() => {
    if (tab === 'new' && orders.length === 0) fetchOrders();
  }, [tab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/mine');
      setReports(data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data } = await api.get('/orders/myorders');
      setOrders(data);
    } catch {
      /* silent — user may still type an order manually */
    } finally {
      setOrdersLoading(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId) { toast.error('Please select an order'); return; }
    if (!form.message.trim()) { toast.error('Please write a message'); return; }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        orderId: form.orderId,
        type:    form.type,
        message: form.message,
        rating:  form.type === 'review' && form.rating > 0 ? form.rating : undefined,
      });
      toast.success('Report submitted successfully');
      setForm({ orderId: '', type: 'complaint', message: '', rating: 0 });
      setTab('history');
      await fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total:     reports.length,
    pending:   reports.filter((r) => r.status === 'pending').length,
    resolved:  reports.filter((r) => r.status === 'resolved').length,
  }), [reports]);

  if (!userInfo) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <h1 className="text-3xl font-extrabold mb-1 relative z-10 flex items-center gap-3">
          <FileText size={28} /> My Reports &amp; Reviews
        </h1>
        <p className="text-indigo-200 relative z-10 text-sm">
          Track your filed complaints and store reviews.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['history', 'new'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all capitalize ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'history' ? 'My History' : '+ New Report'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── HISTORY TAB ────────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              /* ── Empty State ─────────────────────────────────────────────── */
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-14 text-center">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={36} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No reports filed yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm max-w-xs mx-auto">
                  You haven&apos;t filed any complaints or reviews. Had an issue with an order? Let us know!
                </p>
                <button
                  onClick={() => setTab('new')}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition"
                >
                  <Send size={16} /> File a Report
                </button>
              </div>
            ) : (
              <>
                {/* ── Summary Bar ─────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Filed', value: summary.total,    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', icon: <FileText size={20} /> },
                    { label: 'Pending',     value: summary.pending,  color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400', icon: <Clock size={20} /> },
                    { label: 'Resolved',    value: summary.resolved, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',     icon: <CheckCircle2 size={20} /> },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Report Cards ─────────────────────────────────────────── */}
                <div className="space-y-4">
                  {reports.map((r, idx) => {
                    const isOpen = !!expanded[r._id];
                    const storeName = r.seller?.storeName ?? r.seller?.name ?? 'Unknown Store';
                    const orderId   = r.order?._id ?? r.order;

                    return (
                      <motion.div
                        key={r._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
                      >
                        {/* Card header */}
                        <button
                          onClick={() => setExpanded((prev) => ({ ...prev, [r._id]: !isOpen }))}
                          className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Type badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              r.type === 'complaint'
                                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                            }`}>
                              {r.type === 'complaint' ? <AlertCircle size={10} /> : <Star size={10} />}
                              {r.type}
                            </span>
                            <StatusPill status={r.status} />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{storeName}</span>
                            {r.rating && <Stars rating={r.rating} />}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                            {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                                {/* Order reference */}
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <ShoppingBag size={13} />
                                  <span>Order:</span>
                                  <Link
                                    href={`/order/${orderId}`}
                                    className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    #{String(orderId).slice(-8).toUpperCase()}
                                  </Link>
                                  {r.order?.createdAt && (
                                    <span className="ml-2 text-gray-400">
                                      placed {new Date(r.order.createdAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>

                                {/* Message */}
                                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Your message</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{r.message}</p>
                                </div>

                                {/* Admin notes (if any) */}
                                {r.adminNotes && (
                                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Admin Response
                                    </p>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">{r.adminNotes}</p>
                                  </div>
                                )}

                                {/* Timestamps */}
                                <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                  <span>Submitted: <strong className="text-gray-600 dark:text-gray-300">{new Date(r.createdAt).toLocaleString()}</strong></span>
                                  {r.updatedAt !== r.createdAt && (
                                    <span>Last updated: <strong className="text-gray-600 dark:text-gray-300">{new Date(r.updatedAt).toLocaleString()}</strong></span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── NEW REPORT TAB ─────────────────────────────────────────────────── */}
        {tab === 'new' && (
          <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Send size={20} className="text-indigo-500" /> File a Complaint or Review
              </h2>

              <form onSubmit={submitReport} className="space-y-6">
                {/* Order picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Select Order <span className="text-red-500">*</span>
                  </label>
                  {ordersLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                      <Loader2 size={16} className="animate-spin" /> Loading your orders…
                    </div>
                  ) : (
                    <select
                      value={form.orderId}
                      onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
                    >
                      <option value="">— Choose an order —</option>
                      {orders.map((o) => (
                        <option key={o._id} value={o._id}>
                          #{o._id.slice(-8).toUpperCase()} &nbsp;·&nbsp; {new Date(o.createdAt).toLocaleDateString()} &nbsp;·&nbsp; ₹{o.totalPrice.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Type selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Report Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['complaint', 'review'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t, rating: 0 })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all capitalize ${
                          form.type === t
                            ? t === 'complaint'
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {t === 'complaint' ? <AlertCircle size={16} /> : <Star size={16} />} {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating — only for reviews */}
                {form.type === 'review' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Rating (optional)</label>
                    <StarInput value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
                  </motion.div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    required
                    placeholder={
                      form.type === 'complaint'
                        ? 'Describe the issue you faced with this order…'
                        : 'Share your experience with this store…'
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.message.length} characters</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                  ) : (
                    <><Send size={18} /> Submit Report</>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
