'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const setUserInfo = useStore((state) => state.setUserInfo);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (payload: any) => {
    const { data } = await api.post('/users/login', payload);

    if (data.requires2FA) {
      setTwoFactorMode(true);
      setResendCooldown(30); // 30 second cooldown before resend
      toast.success(data.message || '2FA code sent to your email.');
      return;
    }

    // Login succeeded — set user and navigate
    setUserInfo(data);
    const localCart = useStore.getState().cart;
    if (localCart.length > 0) {
      const mergedCart = [...(data.cart || [])];
      for (const item of localCart) {
        const existing = mergedCart.find((x: any) => x.product === item.product);
        if (existing) {
          existing.qty = Math.max(existing.qty, item.qty);
        } else {
          mergedCart.push(item);
        }
      }
      useStore.getState().setCart(mergedCart);
      api.put('/users/cart', { cart: mergedCart }).catch(console.error);
    } else if (data.cart) {
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
  };

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload: any = { email, password };
    if (twoFactorMode) payload.twoFactorCode = twoFactorCode;

    // Retry logic for Render cold starts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await handleLogin(payload);
        setLoading(false);
        return; // Success — exit
      } catch (err: any) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || '';

        // Backend sleeping — retry
        if ((!status || status === 502 || status === 503 || status === 504 || err.code === 'ECONNABORTED') && attempt < 3) {
          toast.loading(`Server waking up... retry ${attempt}/3`, { id: 'login-retry' });
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        toast.dismiss('login-retry');

        const errorMsg = msg || (err.code === 'ECONNABORTED' ? 'Server is starting up. Please try again in 30 seconds.' : 'Invalid email or password');
        setError(errorMsg);
        toast.error(errorMsg);

        // If 2FA code was invalid, let user retry
        if (twoFactorMode && msg.includes('expired')) {
          setTwoFactorMode(false);
          setTwoFactorCode('');
        }
        break;
      }
    }
    setLoading(false);
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      // Re-submit login without 2FA code to trigger new code generation
      await handleLogin({ email, password });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = local.length > 2 
      ? local[0] + '•'.repeat(Math.min(local.length - 2, 4)) + local.slice(-1) 
      : local;
    return `${maskedLocal}@${domain}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center py-16"
    >
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800">
        <AnimatePresence mode="wait">
          {twoFactorMode ? (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* 2FA Verification View */}
              <button
                onClick={() => {
                  setTwoFactorMode(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-600 transition mb-6 text-sm font-medium"
              >
                <ArrowLeft size={16} /> Back to login
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  We&apos;ve sent a 6-digit code to<br />
                  <strong className="text-gray-700 dark:text-gray-300">{maskEmail(email)}</strong>
                </p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-sm text-center font-medium border border-red-100 dark:border-red-800">
                  {error}
                </motion.div>
              )}

              <form onSubmit={submitHandler} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="• • • • • •"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length !== 6}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all transform disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Verify & Sign In'}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Didn&apos;t receive the code? Check your spam folder.</p>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resendCooldown > 0 || loading}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <RefreshCw size={14} className={resendCooldown > 0 ? 'animate-spin' : ''} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Normal Login View */}
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      id="login-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
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
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pl-11 pr-11 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
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

                <button
                  type="submit"
                  id="login-submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all transform disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing In...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                New to FreshMarket?{' '}
                <Link href="/register" className="text-green-600 font-bold hover:underline">
                  Create an account
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
