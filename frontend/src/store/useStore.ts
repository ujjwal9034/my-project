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
}

export interface CartItem {
  product: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  seller: string;
  sellerPickupSlots?: string[];
}

interface AppState {
  userInfo: User | null;
  setUserInfo: (user: User | null) => void;
  cart: CartItem[];
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
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userInfo: null,
      setUserInfo: (user) => set({ userInfo: user }),
      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existingItem = state.cart.find((x) => x.product === item.product);
          if (existingItem) {
            return {
              cart: state.cart.map((x) => (x.product === existingItem.product ? item : x)),
            };
          } else {
            return { cart: [...state.cart, item] };
          }
        }),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((x) => x.product !== id),
        })),
      updateCartQty: (productId, qty) =>
        set((state) => ({
          cart: state.cart.map((x) => x.product === productId ? { ...x, qty } : x),
        })),
      clearCart: () => set({ cart: [] }),
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
    }),
    {
      name: 'marketplace-storage',
    }
  )
);
