'use client';

import Link from 'next/link';
import { ShieldCheck, Truck, Heart, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white mt-16 transition-colors">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-2xl font-extrabold text-green-400 flex items-center gap-1.5 mb-3">
              🥬 FreshMart Grocery
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your neighborhood&apos;s favorite grocery marketplace. Fresh, local, delivered.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Shop</h3>
            <ul className="space-y-2.5">
              {['All Products', 'Fruits', 'Vegetables', 'Dairy'].map((item) => (
                <li key={item}>
                  <Link href="/" className="text-sm text-gray-400 hover:text-green-400 transition flex items-center gap-1 group">
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Company</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/' },
                { label: 'Sell on FreshMart', href: '/register' },
                { label: 'Careers', href: '/' },
                { label: 'Contact', href: '/' },
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
                { label: 'Help Center', href: '/' },
                { label: 'Track Order', href: '/profile' },
                { label: 'Returns', href: '/' },
                { label: 'Privacy Policy', href: '/' },
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
            &copy; 2026 FreshMart Grocery. All rights reserved.
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
