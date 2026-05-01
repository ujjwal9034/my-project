'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/users/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err: any) {
      // Still show success message for security (don't reveal if user exists)
      setSent(true);
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
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        {sent ? (
          <div className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            </motion.div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              If an account with <strong>{email}</strong> exists, we&apos;ve sent a password reset link. 
              The link will expire in 10 minutes.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Try Another Email
              </button>
              <Link
                href="/login"
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            <Link href="/login" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-600 transition mb-6 text-sm font-medium">
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Forgot Password?</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                No worries! Enter your email address and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={submitHandler} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    required
                    placeholder="you@example.com"
                  />
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <button
                type="submit"
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
