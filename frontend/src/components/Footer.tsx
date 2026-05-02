'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { ShieldCheck, Truck, Heart, ArrowRight, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Footer() {
  const { userInfo } = useStore();
  const [email, setEmail] = useState('');

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter a valid email');
      return;
    }
    toast.success('Thank you for subscribing! 🎉');
    setEmail('');
  };

  return (
    <footer className="bg-gray-900 dark:bg-slate-950 text-white mt-16 transition-colors">
      {/* Feature strip */}
      <div className="border-b border-gray-800 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Truck size={22} />, title: 'Free Delivery', desc: 'On orders over ₹50' },
              { icon: <ShieldCheck size={22} />, title: 'Secure Payments', desc: 'Card, UPI & COD accepted' },
              { icon: <Heart size={22} />, title: 'Fresh Guarantee', desc: '100% quality assurance' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-xl text-green-400">
                  {feature.icon}
                </div>
                <div>
                  <p className="font-bold text-sm">{feature.title}</p>
                  <p className="text-gray-400 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="text-2xl font-extrabold text-green-400 flex items-center gap-1.5 mb-3">
              🥬 FreshMart Grocery
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Your neighborhood&apos;s favorite grocery marketplace. Fresh, local, delivered.
            </p>
            {/* Newsletter */}
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email for deals"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-1.5 text-sm font-bold flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* Shop - Functional category links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Shop</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'All Products', href: '/' },
                { label: 'Fruits', href: '/?category=Fruits' },
                { label: 'Vegetables', href: '/?category=Vegetables' },
                { label: 'Dairy & Eggs', href: '/?category=Dairy' },
                { label: 'Bakery', href: '/?category=Bakery' },
                { label: 'Beverages', href: '/?category=Beverages' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-green-400 transition flex items-center gap-1 group">
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account - contextual links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Account</h3>
            <ul className="space-y-2.5">
              {[
                { label: userInfo ? 'My Profile' : 'Sign In', href: userInfo ? '/profile' : '/login' },
                { label: 'My Orders', href: userInfo ? '/profile?tab=orders' : '/login' },
                { label: 'My Wishlist', href: '/wishlist' },
                { label: 'Browse Stores', href: '/stores' },
                ...(userInfo?.role === 'seller' ? [{ label: 'Seller Panel', href: '/seller' }] : []),
                ...(userInfo?.role === 'admin' ? [{ label: 'Admin Panel', href: '/admin' }] : []),
                { label: 'Sell on FreshMart', href: '/register' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-green-400 transition flex items-center gap-1 group">
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Support</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Track Order', href: userInfo ? '/profile?tab=orders' : '/login' },
                { label: 'File a Report', href: userInfo?.role === 'customer' ? '/reports' : '/login' },
                { label: 'My Cart', href: '/cart' },
                { label: 'Forgot Password', href: '/forgot-password' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-green-400 transition flex items-center gap-1 group">
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} FreshMart Grocery. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-md">🔒 SSL Secured</span>
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-md">💳 PCI Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
