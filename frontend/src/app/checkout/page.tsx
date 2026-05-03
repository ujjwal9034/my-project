'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api, { getImageUrl } from '@/utils/api';
import { Check, ChevronRight, MapPin, CreditCard, ShoppingBag, ShieldCheck, Truck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const STEPS = ['Shipping', 'Payment', 'Review'];

export default function Checkout() {
  const router = useRouter();
  const { userInfo, cart, clearCart } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Shipping State
  const [deliveryType, setDeliveryType] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [pickupSlotTime, setPickupSlotTime] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    address: '', city: '', postalCode: '', country: 'India'
  });
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');

  // Calculations
  const itemsPrice = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const sellerCharges = new Map<string, number>();
  cart.forEach(item => {
    if (!sellerCharges.has(item.seller) || (item.sellerDeliveryCharge ?? 5) > sellerCharges.get(item.seller)!) {
      sellerCharges.set(item.seller, item.sellerDeliveryCharge ?? 5);
    }
  });
  const shippingPrice = deliveryType === 'Pickup' ? 0 : Array.from(sellerCharges.values()).reduce((a, b) => a + b, 0);
  const taxPrice = Number((0.05 * itemsPrice).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // Extract seller pickup slots from cart items
  const availablePickupSlots = cart.reduce((slots: string[], item) => {
    if (item.sellerPickupSlots) {
      item.sellerPickupSlots.forEach(slot => {
        if (!slots.includes(slot)) slots.push(slot);
      });
    }
    return slots;
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!userInfo) {
      // Small delay to allow Zustand to rehydrate from localStorage
      const timer = setTimeout(() => {
        if (!useStore.getState().userInfo) {
          router.push('/login?redirect=/checkout');
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (cart.length === 0 && !success) {
      router.push('/cart');
    } else if (cart.length > 0 && !success && !isValidating) {
      // Validate cart items exist on the server
      const validateCart = async () => {
        setIsValidating(true);
        let hasInvalidItems = false;
        try {
          for (const item of cart) {
            try {
              // Using absolute paths to ensure proxy works correctly
              await api.get(`/products/${item.product}`);
            } catch (err: any) {
              if (err.response?.status === 404 || err.response?.status === 400 || err.message.includes('CastError')) {
                useStore.getState().removeFromCart(item.product);
                hasInvalidItems = true;
              }
            }
          }
          if (hasInvalidItems) {
            toast.error('Some items in your cart were no longer available and have been removed.');
          }
        } finally {
          setIsValidating(false);
        }
      };
      validateCart();
    }
  }, [userInfo, cart.length, router, success, cart, clearCart, isMounted, isValidating]);

  useEffect(() => {
    if (isMounted && userInfo && !success) {
      fetchAddresses();
    }
  }, [userInfo, success, isMounted]);

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/users/profile');
      if (data.addresses) setSavedAddresses(data.addresses);
      if (data.addresses?.length > 0) {
        const defaultAddr = data.addresses.find((a: any) => a.isDefault) || data.addresses[0];
        setShippingAddress({ address: defaultAddr.address, city: defaultAddr.city, postalCode: defaultAddr.postalCode, country: defaultAddr.country });
      }
    } catch (error) {
      console.error('Failed to fetch addresses', error);
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 0) {
      if (deliveryType === 'Delivery') {
        if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode) {
          toast.error('Please fill in all shipping fields');
          return;
        }
      } else {
        if (!pickupSlotTime) {
          toast.error('Please select a pickup time');
          return;
        }
      }
    }
    if (currentStep === 1) {
      if (paymentMethod === 'Card') {
        if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv) {
          toast.error('Please complete card details');
          return;
        }
        if (cardDetails.number.replace(/\s/g, '').endsWith('0000')) {
          toast.error('Cards ending in 0000 are declined (Simulation)');
          return;
        }
      } else if (paymentMethod === 'UPI' && !upiId) {
        toast.error('Please enter UPI ID');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      // 1. Save address if requested
      if (deliveryType === 'Delivery' && saveAddress) {
        try {
          await api.post('/users/addresses', { ...shippingAddress, label: 'Saved Address' });
        } catch (error) {
          console.error('Failed to save address', error);
        }
      }

      // 2. Create Order
      const { data: order } = await api.post('/orders', {
        orderItems: cart,
        shippingAddress: deliveryType === 'Delivery' ? shippingAddress : undefined,
        paymentMethod,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
        deliveryType,
        pickupSlotTime: deliveryType === 'Pickup' ? pickupSlotTime : undefined,
      });

      // 2. Process Payment
      await api.post('/payment/process', {
        orderId: order._id,
        paymentMethod,
        amount: totalPrice,
        ...(paymentMethod === 'Card' ? {
          cardNumber: cardDetails.number,
          expiryDate: cardDetails.expiry,
          cvv: cardDetails.cvv
        } : {}),
        ...(paymentMethod === 'UPI' ? { upiId } : {})
      });

      setOrderId(order._id);
      setSuccess(true);
      clearCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="flex justify-center items-center py-20">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl text-center max-w-md border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Order Confirmed!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Thank you for your purchase. We've received your order and will begin processing it right away.</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Order Reference</p>
            <p className="font-mono font-bold text-gray-900 dark:text-white text-lg">#{orderId.slice(-8)}</p>
          </div>
          <button onClick={() => router.push(`/order/${orderId}`)} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition">
            Track Order
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8 text-center">Secure Checkout</h1>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-12 relative max-w-2xl mx-auto">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0 rounded-full"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 z-0 transition-all duration-500 rounded-full" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}></div>
        
        {STEPS.map((step, index) => (
          <div key={step} className="relative z-10 flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-all duration-300 ${
              index <= currentStep 
                ? 'bg-green-500 border-green-100 dark:border-green-900/30 text-white shadow-lg' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {index < currentStep ? <Check size={18} strokeWidth={3} /> : index + 1}
            </div>
            <span className={`mt-2 text-sm font-bold ${index <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{step}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <form onSubmit={handleNext}>
                
                {/* STEP 1: SHIPPING */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-900 dark:text-white"><MapPin className="text-green-500" /> Delivery Options</h2>
                    
                    <div className="flex gap-4 mb-6">
                      <label className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition ${deliveryType === 'Delivery' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800'}`}>
                        <input type="radio" name="deliveryType" value="Delivery" checked={deliveryType === 'Delivery'} onChange={() => setDeliveryType('Delivery')} className="hidden" />
                        <Truck size={24} className={deliveryType === 'Delivery' ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'} />
                        <span className="font-bold text-gray-900 dark:text-white">Delivery</span>
                      </label>
                      <label className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition ${deliveryType === 'Pickup' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800'}`}>
                        <input type="radio" name="deliveryType" value="Pickup" checked={deliveryType === 'Pickup'} onChange={() => setDeliveryType('Pickup')} className="hidden" />
                        <ShoppingBag size={24} className={deliveryType === 'Pickup' ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'} />
                        <span className="font-bold text-gray-900 dark:text-white">Store Pickup</span>
                      </label>
                    </div>

                    {deliveryType === 'Delivery' ? (
                      <>
                        {savedAddresses.length > 0 && (
                      <div className="mb-6 space-y-3">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Saved Addresses</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {savedAddresses.map((addr) => (
                            <div 
                              key={addr._id} 
                              onClick={() => setShippingAddress({ address: addr.address, city: addr.city, postalCode: addr.postalCode, country: addr.country })}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                                shippingAddress.address === addr.address ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800'
                              }`}
                            >
                              <span className="text-xs font-bold bg-white dark:bg-gray-800 px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700">{addr.label}</span>
                              <p className="text-sm font-medium mt-2 dark:text-gray-200">{addr.address}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{addr.city}, {addr.postalCode}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 my-4">
                          <hr className="flex-1 border-gray-200 dark:border-gray-700" />
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Or enter new</span>
                          <hr className="flex-1 border-gray-200 dark:border-gray-700" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Address</label>
                        <input type="text" value={shippingAddress.address} onChange={e => setShippingAddress({...shippingAddress, address: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">City</label>
                          <input type="text" value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                          <input type="text" value={shippingAddress.postalCode} onChange={e => setShippingAddress({...shippingAddress, postalCode: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                        </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <input type="checkbox" id="saveAddress" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="w-5 h-5 text-green-600 rounded-md focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                        <label htmlFor="saveAddress" className="text-sm font-medium text-gray-700 dark:text-gray-300">Save this address for future use</label>
                      </div>
                      </>
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preferred Pickup Time</label>
                          {availablePickupSlots.length > 0 ? (
                            <select value={pickupSlotTime} onChange={e => setPickupSlotTime(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition">
                              <option value="">Select a time slot</option>
                              {availablePickupSlots.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          ) : (
                            <input type="time" value={pickupSlotTime} onChange={e => setPickupSlotTime(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 transition" />
                          )}
                          <p className="text-xs text-gray-500 mt-2">These times are provided by the store.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: PAYMENT */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-900 dark:text-white"><CreditCard className="text-blue-500" /> Payment Method</h2>
                    
                    <div className="space-y-3">
                      {['Card', 'UPI', 'COD'].map((method) => (
                        <label key={method} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === method ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'}`}>
                          <div className="flex items-center gap-3">
                            <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                            <span className="font-bold text-gray-900 dark:text-white">{method === 'COD' ? 'Cash on Delivery' : method === 'Card' ? 'Credit / Debit Card' : 'UPI Transfer'}</span>
                          </div>
                          {method === 'Card' && <div className="flex gap-1 text-xs text-gray-400">VISA / MC</div>}
                        </label>
                      ))}
                    </div>

                    <AnimatePresence>
                      {paymentMethod === 'Card' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200 dark:border-gray-600 space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Card Number</label>
                              <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={cardDetails.number} onChange={e => setCardDetails({...cardDetails, number: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()})} required className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Expiry Date</label>
                                <input type="text" placeholder="MM/YY" maxLength={5} value={cardDetails.expiry} onChange={e => setCardDetails({...cardDetails, expiry: e.target.value})} required className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">CVV</label>
                                <input type="password" placeholder="•••" maxLength={4} value={cardDetails.cvv} onChange={e => setCardDetails({...cardDetails, cvv: e.target.value})} required className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {paymentMethod === 'UPI' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 overflow-hidden">
                          <input type="text" placeholder="name@upi" value={upiId} onChange={e => setUpiId(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* STEP 3: REVIEW */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-900 dark:text-white"><ShoppingBag className="text-purple-500" /> Review Order</h2>
                    
                    <div className="space-y-4">
                      {cart.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                          <img src={getImageUrl(item.image)} alt={item.name} className="w-16 h-16 object-cover rounded-lg bg-gray-200 dark:bg-gray-800" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 dark:text-white truncate">{item.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.qty}</p>
                          </div>
                          <span className="font-extrabold text-gray-900 dark:text-white">₹{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3 mt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{deliveryType === 'Pickup' ? 'Pickup Details' : 'Deliver to'}</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {deliveryType === 'Pickup' ? `Store Pickup at ${pickupSlotTime}` : `${shippingAddress.address}, ${shippingAddress.city} ${shippingAddress.postalCode}`}
                          </p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(0)} className="text-green-600 dark:text-green-400 text-sm font-bold hover:underline">Edit</button>
                      </div>
                      <hr className="border-gray-200 dark:border-gray-600" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Payment Method</p>
                          <p className="font-medium text-gray-900 dark:text-white">{paymentMethod}</p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(1)} className="text-green-600 dark:text-green-400 text-sm font-bold hover:underline">Edit</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-4">
                  {currentStep > 0 ? (
                    <button type="button" onClick={() => setCurrentStep(p => p - 1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      Back
                    </button>
                  ) : <div></div>}
                  
                  {currentStep < 2 ? (
                    <button type="submit" className="flex items-center gap-2 bg-green-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-700 transition">
                      Continue <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button type="button" onClick={placeOrder} disabled={loading} className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:from-green-700 hover:to-green-600 transition disabled:opacity-50">
                      {loading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><ShieldCheck size={18} /> Place Order</>}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Order Summary</h3>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between"><span>Items ({cart.reduce((a,c) => a+c.qty, 0)})</span><span className="font-medium text-gray-900 dark:text-white">₹{itemsPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>{deliveryType === 'Pickup' ? 'Pickup' : 'Shipping'}</span><span className="font-medium text-gray-900 dark:text-white">{deliveryType === 'Pickup' || shippingPrice === 0 ? 'Free' : `₹${shippingPrice.toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span>Tax (5%)</span><span className="font-medium text-gray-900 dark:text-white">₹{taxPrice.toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between items-center text-xl font-extrabold text-gray-900 dark:text-white mb-6">
              <span>Total</span>
              <span className="text-green-600 dark:text-green-400">₹{totalPrice.toFixed(2)}</span>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mt-4">
              <ShieldCheck className="text-green-500 shrink-0" size={24} />
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Payments are securely encrypted. Your details are never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
