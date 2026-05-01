'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/utils/api';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, Check, X as XIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
  const allPassed = Object.values(passwordChecks).every(Boolean);

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!allPassed) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/reset-password/${token}`, { password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Password Reset!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Your password has been reset successfully. Redirecting to sign in...
          </p>
          <div className="w-16 h-1 bg-green-500 rounded-full mx-auto animate-pulse" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center py-16"
    >
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Reset Password</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Enter your new password below.
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                required
                placeholder="Create a strong password"
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

            {password && (
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {[
                  { key: 'length', label: '8+ characters' },
                  { key: 'uppercase', label: 'Uppercase letter' },
                  { key: 'lowercase', label: 'Lowercase letter' },
                  { key: 'number', label: 'Number' },
                ].map(({ key, label }) => (
                  <span key={key} className={`flex items-center gap-1 ${
                    (passwordChecks as any)[key] ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {(passwordChecks as any)[key] ? <Check size={12} /> : <XIcon size={12} />}
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                required
                placeholder="Re-enter your password"
              />
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XIcon size={12} /> Passwords don&apos;t match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !allPassed}
            className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Resetting...
              </span>
            ) : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Remember your password?{' '}
          <Link href="/login" className="text-green-600 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
