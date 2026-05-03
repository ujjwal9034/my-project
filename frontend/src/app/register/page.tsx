'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Store, ShoppingBag, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUserInfo = useStore((state) => state.setUserInfo);

  const passwordStrength = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  }, [password]);

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordStrength.score < 4) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    setError('');
    setEmailError('');

    try {
      const { data } = await api.post('/users', { name, email, password, role, storeName: role === 'seller' ? storeName : undefined });
      setUserInfo(data);
      const localCart = useStore.getState().cart;
      if (localCart.length > 0) {
        api.put('/users/cart', { cart: localCart }).catch(console.error);
      }
      toast.success(`Welcome to FreshMarket, ${data.name}!`);
      if (data.role === 'admin') router.push('/admin');
      else if (data.role === 'seller') router.push('/seller');
      else router.push('/');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Registration failed';
      if (status === 422) {
        // Email deliverability failure — show inline below the email field
        setEmailError(msg);
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center py-10"
    >
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🛒</div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Create Account</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Join FreshMarket today</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-sm text-center font-medium border border-red-100 dark:border-red-800">
            {error}
          </motion.div>
        )}
        
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
            <div className="relative">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="John Doe"
                className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                required
                placeholder="you@example.com"
                className={`w-full px-4 py-3 pl-11 rounded-xl border ${
                  emailError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-200 dark:border-gray-600 focus:ring-green-500'
                } dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 transition`}
              />
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {emailError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1"
              >
                <X size={12} />
                {emailError}
              </motion.p>
            )}
            {loading && !emailError && (
              <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Verifying email...
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('customer')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  role === 'customer' ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-200 dark:hover:border-green-800'
                }`}>
                <ShoppingBag size={18} /> Shopper
              </button>
              <button type="button" onClick={() => setRole('seller')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  role === 'seller' ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-200 dark:hover:border-green-800'
                }`}>
                <Store size={18} /> Seller
              </button>
            </div>
          </div>

          {role === 'seller' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-2">Store Name</label>
              <div className="relative mb-2">
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required={role === 'seller'}
                  placeholder="Your Shop Name"
                  className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                <Store size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="Create a strong password"
                className="w-full px-4 py-3 pl-11 pr-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength */}
            {password && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                      i <= passwordStrength.score ? strengthColor[passwordStrength.score] : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  ))}
                </div>
                <p className={`text-xs font-semibold ${
                  passwordStrength.score <= 1 ? 'text-red-500' :
                  passwordStrength.score === 2 ? 'text-yellow-500' :
                  passwordStrength.score === 3 ? 'text-blue-500' : 'text-green-500'
                }`}>
                  {strengthLabel[passwordStrength.score]}
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { key: 'length', label: '8+ characters' },
                    { key: 'uppercase', label: 'Uppercase letter' },
                    { key: 'lowercase', label: 'Lowercase letter' },
                    { key: 'number', label: 'Number' },
                  ].map(({ key, label }) => (
                    <span key={key} className={`flex items-center gap-1 ${
                      (passwordStrength.checks as any)[key] ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {(passwordStrength.checks as any)[key] ? <Check size={12} /> : <X size={12} />}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
            <div className="relative">
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><X size={12} /> Passwords don't match</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying email...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
