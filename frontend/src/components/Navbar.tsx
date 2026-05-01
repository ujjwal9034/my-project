'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { ShoppingCart, User, LogOut, Search, Heart, Menu, X, ChevronDown, Moon, Sun, FileText } from 'lucide-react';
import api from '@/utils/api';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { userInfo, cart, setUserInfo, wishlist, darkMode, toggleDarkMode } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Initialize dark mode on mount
  useEffect(() => {
    if (darkMode && typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/users/logout');
      setUserInfo(null);
      setProfileMenuOpen(false);
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const getDashboardLink = () => {
    if (!userInfo) return '/login';
    if (userInfo.role === 'admin') return '/admin';
    if (userInfo.role === 'seller') return '/seller';
    return '/profile';
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-green-600 tracking-tight flex items-center gap-1.5">
              <span className="text-3xl">🥬</span>
              FreshMart Grocery
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center space-x-6 ml-6 text-sm font-semibold">
              <Link href="/" className={`hover:text-green-600 ${pathname === '/' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Home</Link>
              
              {!userInfo && (
                <>
                  <Link href="/login" className={`hover:text-green-600 ${pathname === '/login' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Login</Link>
                  <Link href="/register" className={`hover:text-green-600 ${pathname === '/register' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Register</Link>
                </>
              )}

              {userInfo?.role === 'customer' && (
                <>
                  <Link href="/stores" className={`hover:text-green-600 ${pathname === '/stores' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Stores</Link>
                  <Link href="/profile" className={`hover:text-green-600 ${pathname === '/profile' && searchParams?.get('tab') !== 'addresses' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Orders</Link>
                  <Link href="/profile?tab=addresses" className={`hover:text-green-600 ${searchParams?.get('tab') === 'addresses' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Addresses</Link>
                  <Link href="/cart" className={`hover:text-green-600 ${pathname === '/cart' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Cart</Link>
                  <button onClick={handleLogout} className="text-red-600 hover:text-red-700">Logout</button>
                </>
              )}

              {userInfo?.role === 'seller' && (
                <>
                  <Link href="/seller" className={`hover:text-green-600 ${pathname === '/seller' && searchParams?.get('tab') !== 'orders' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Owner Panel</Link>
                  <Link href="/seller?tab=orders" className={`hover:text-green-600 ${searchParams?.get('tab') === 'orders' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Orders</Link>
                  <button onClick={handleLogout} className="text-red-600 hover:text-red-700">Logout</button>
                </>
              )}

              {userInfo?.role === 'admin' && (
                <>
                  <Link href="/stores" className={`hover:text-green-600 ${pathname === '/stores' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Stores</Link>
                  <Link href="/admin" className={`hover:text-green-600 ${pathname === '/admin' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>Admin Panel</Link>
                  <button onClick={handleLogout} className="text-red-600 hover:text-red-700">Logout</button>
                </>
              )}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-72 px-4 py-2 pl-10 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </form>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Wishlist */}
            {userInfo && (
              <Link href="/wishlist" className="relative text-gray-500 dark:text-gray-400 hover:text-red-500 transition p-2 hidden sm:block" title="Wishlist">
                <Heart size={22} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                    {wishlist.length}
                  </span>
                )}
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="relative text-gray-600 dark:text-gray-400 hover:text-green-600 transition p-2">
              <ShoppingCart size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-green-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {cart.reduce((a, item) => a + item.qty, 0)}
                </span>
              )}
            </Link>

            {userInfo ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center text-gray-700 dark:text-gray-300 hover:text-green-600 transition font-medium gap-1.5"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {userInfo.name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm">{userInfo.name.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`hidden sm:block transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{userInfo.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400">
                        {userInfo.role}
                      </span>
                    </div>
                    <Link
                      href={getDashboardLink()}
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <User size={16} />
                      {userInfo.role === 'admin' ? 'Admin Dashboard' : userInfo.role === 'seller' ? 'Seller Dashboard' : 'My Profile'}
                    </Link>
                    {userInfo.role === 'customer' && (
                      <Link
                        href="/wishlist"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <Heart size={16} />
                        My Wishlist
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <ShoppingCart size={16} />
                      My Orders
                    </Link>
                    {userInfo.role === 'customer' && (
                      <Link
                        href="/reports"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <FileText size={16} />
                        My Reports
                      </Link>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-gray-600 dark:text-gray-400 hover:text-green-600 px-3 py-2 text-sm font-medium transition hidden sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-green-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-green-700 transition shadow-sm text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 transition"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-lg">
          <div className="p-4 space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </form>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                🏠 Home
              </Link>
              <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                🛒 Cart ({cart.reduce((a, i) => a + i.qty, 0)})
              </Link>
              {userInfo && (
                <>
                  <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                    ❤️ Wishlist
                  </Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                    📦 Orders
                  </Link>
                  <Link href="/stores" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                    🏪 Stores
                  </Link>
                  {userInfo.role === 'customer' && (
                    <Link href="/reports" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                      📋 Reports
                    </Link>
                  )}
                  <button onClick={handleLogout} className="text-center py-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition col-span-2">
                    Sign Out
                  </button>
                </>
              )}
              {!userInfo && (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition">
                    Sign In
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
