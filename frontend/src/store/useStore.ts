import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  isApproved?: boolean;
  phone?: string;
  address?: string;
  storeName?: string;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  pickupSlots?: string[];
  isBanned?: boolean;
  account_status?: 'active' | 'warned' | 'banned' | 'removed';
  warningCount?: number;
  banReason?: string;
  preferences?: { deliveryCharge?: number; freeDeliveryAbove?: number };
  location?: { coordinates: [number, number] };
  twoFactorEnabled?: boolean;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  kycDocument?: string;
}

export interface CartItem {
  product: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  seller: string;
  sellerName?: string;
  sellerPickupSlots?: string[];
  sellerDeliveryCharge?: number;
}

interface AppState {
  userInfo: User | null;
  setUserInfo: (user: User | null) => void;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  wishlist: string[];
  setWishlist: (ids: string[]) => void;
  toggleWishlistItem: (id: string) => void;
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  location: { lat: number; lng: number } | null;
  setLocation: (loc: { lat: number; lng: number } | null) => void;
  // Soft-delete: hides orders from customer view only (DB untouched)
  hiddenOrderIds: string[];
  hideOrder: (orderId: string) => void;
  // Selected delivery address (persisted)
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  // Seller local state
  sellerHiddenOrderIds: string[];
  hideSellerOrder: (orderId: string) => void;
  seenOrderIds: string[];
  markOrderSeen: (orderId: string) => void;
  // Backend wakeup state (not persisted)
  backendReady: boolean;
  setBackendReady: (ready: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userInfo: null,
      setUserInfo: (user) => set({ userInfo: user }),
      cart: [],
      setCart: (cart) => set({ cart }),
      addToCart: (item) =>
        set((state) => {
          const existingItem = state.cart.find((x) => x.product === item.product);
          const newCart = existingItem
            ? state.cart.map((x) => (x.product === existingItem.product ? item : x))
            : [...state.cart, item];
          
          if (state.userInfo) {
            import('@/utils/api').then(m => m.default.put('/users/cart', { cart: newCart }).catch(console.error));
          }
          return { cart: newCart };
        }),
      removeFromCart: (id) =>
        set((state) => {
          const newCart = state.cart.filter((x) => x.product !== id);
          if (state.userInfo) {
            import('@/utils/api').then(m => m.default.put('/users/cart', { cart: newCart }).catch(console.error));
          }
          return { cart: newCart };
        }),
      updateCartQty: (productId, qty) =>
        set((state) => {
          const newCart = state.cart.map((x) => x.product === productId ? { ...x, qty } : x);
          if (state.userInfo) {
            import('@/utils/api').then(m => m.default.put('/users/cart', { cart: newCart }).catch(console.error));
          }
          return { cart: newCart };
        }),
      clearCart: () => set((state) => {
        if (state.userInfo) {
          import('@/utils/api').then(m => m.default.put('/users/cart', { cart: [] }).catch(console.error));
        }
        return { cart: [] };
      }),
      wishlist: [],
      setWishlist: (ids) => set({ wishlist: ids }),
      toggleWishlistItem: (id) =>
        set((state) => ({
          wishlist: state.wishlist.includes(id)
            ? state.wishlist.filter((x) => x !== id)
            : [...state.wishlist, id],
        })),
      recentlyViewed: [],
      addRecentlyViewed: (productId) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== productId);
          return { recentlyViewed: [productId, ...filtered].slice(0, 10) };
        }),
      darkMode: false,
      toggleDarkMode: () =>
        set((state) => {
          const newMode = !state.darkMode;
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newMode);
          }
          return { darkMode: newMode };
        }),
      setDarkMode: (value) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', value);
        }
        set({ darkMode: value });
      },
      location: null,
      setLocation: (loc) => set({ location: loc }),
      hiddenOrderIds: [],
      hideOrder: (orderId) =>
        set((state) => ({ hiddenOrderIds: [...state.hiddenOrderIds, orderId] })),
      selectedAddressId: null,
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),
      sellerHiddenOrderIds: [],
      hideSellerOrder: (orderId) =>
        set((state) => ({ sellerHiddenOrderIds: [...state.sellerHiddenOrderIds, orderId] })),
      seenOrderIds: [],
      markOrderSeen: (orderId) =>
        set((state) => ({
          seenOrderIds: state.seenOrderIds.includes(orderId) ? state.seenOrderIds : [...state.seenOrderIds, orderId]
        })),
      backendReady: false,
      setBackendReady: (ready) => set({ backendReady: ready }),
    }),
    {
      name: 'marketplace-storage',
      partialize: (state) => {
        const { backendReady, ...rest } = state;
        return rest;
      },
    }
  )
);
