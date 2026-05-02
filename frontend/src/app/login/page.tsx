'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const router = useRouter();
  const setUserInfo = useStore((state) => state.setUserInfo);

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = { email, password };
      if (twoFactorMode) payload.twoFactorCode = twoFactorCode;

      const { data } = await api.post('/users/login', payload);
      
      if (data.requires2FA) {
        setTwoFactorMode(true);
        toast.success(data.message);
        setLoading(false);
        return;
      }

      setUserInfo(data);
      if (data.cart) {
        useStore.getState().setCart(data.cart);
      }
      toast.success(`Welcome back, ${data.name}!`);

      // Fetch wishlist after login
      try {
        const wishRes = await api.get('/wishlist');
        useStore.getState().setWishlist((wishRes.data.products || []).map((p: any) => p._id || p));
      } catch {}

      if (data.role === 'admin') router.push('/admin');
      else if (data.role === 'seller') router.push('/seller');
      else router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
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
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🥬</div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Welcome Back</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your FreshMarket account</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-sm text-center font-medium border border-red-100 dark:border-red-800">
            {error}
          </motion.div>
        )}
        

        <form onSubmit={submitHandler} className="space-y-6">
          {twoFactorMode ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">2FA Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-500 mt-2">Check your email for the login code.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    required
                    placeholder="you@example.com"
                  />
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                  <Link href="/forgot-password" className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pl-11 pr-11 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    required
                    placeholder="••••••••"
                  />
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all transform disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {twoFactorMode ? 'Verifying...' : 'Signing In...'}
              </span>
            ) : (twoFactorMode ? 'Verify 2FA' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          New to FreshMarket?{' '}
          <Link href="/register" className="text-green-600 font-bold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
