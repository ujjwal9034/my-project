'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Retry logic for Render cold starts (502 errors)
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data } = await api.post('/users/forgot-password', { email });
        setSent(true);
        setResendCooldown(60);
        toast.success('Reset link sent! Check your email.');
        setLoading(false);
        return;
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const msg = err.response?.data?.message;

        // If it's a 502/503/504 (backend waking up), retry
        if ((!status || status === 502 || status === 503 || status === 504) && attempt < 3) {
          console.log(`Attempt ${attempt} failed (${status || 'network error'}), retrying in 3s...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        // Known error from backend: email couldn't be sent
        if (msg && msg.includes('Email could not be sent')) {
          setError('We couldn\'t send the email right now. Please try again in a few minutes.');
          toast.error('Email service temporarily unavailable');
          break;
        }

        // If status is 200-range response (user not found but we show success for security)
        if (status === 404 || (msg && msg.includes('reset link has been sent'))) {
          setSent(true);
          setResendCooldown(60);
          break;
        }

        // Server/network error — show clear error
        if (!status || status >= 500) {
          setError('Server is starting up. Please wait 30 seconds and try again.');
          toast.error('Server is waking up, please retry shortly');
          break;
        }

        // Other errors
        setError(msg || 'Something went wrong. Please try again.');
        toast.error(msg || 'Request failed');
        break;
      }
    }
    setLoading(false);
  };

  const resendEmail = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await api.post('/users/forgot-password', { email });
      setResendCooldown(60);
      toast.success('Reset link sent again! Check your inbox.');
    } catch {
      toast.error('Could not resend. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center py-16"
    >
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-green-500" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              If an account with <strong className="text-gray-700 dark:text-gray-300">{email}</strong> exists, we&apos;ve sent a password reset link.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              The link will expire in 10 minutes. Check your spam folder too.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={resendEmail}
                disabled={resendCooldown > 0 || loading}
                className="w-full py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} className={resendCooldown > 0 ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
              </button>
              <button
                onClick={() => { setSent(false); setEmail(''); setError(''); }}
                className="w-full py-3 text-gray-500 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition text-sm"
              >
                Try Another Email
              </button>
              <Link
                href="/login"
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 transition text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <Link href="/login" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-600 transition mb-6 text-sm font-medium">
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔐</span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Forgot Password?</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                No worries! Enter your email address and we&apos;ll send you a reset link.
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-sm text-center font-medium border border-red-100 dark:border-red-800 flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            <form onSubmit={submitHandler} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    id="forgot-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    required
                    placeholder="you@example.com"
                    autoFocus
                  />
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <button
                type="submit"
                id="forgot-submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
}
