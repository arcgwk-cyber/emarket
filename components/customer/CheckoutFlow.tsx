'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Gift, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  AlertCircle,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Address {
  id: string;
  recipientName: string;
  recipientMobile: string;
  houseFlat: string;
  building: string | null;
  street: string;
  city: string;
  state: string;
  pincode: string;
  addressType: string;
  deliveryInstructions: string | null;
  isDefault: boolean;
  latitude?: string | null;
  longitude?: string | null;
}

interface DeliverySlot {
  id: string;
  startTime: string;
  endTime: string;
  deliveryCharge: string;
  minOrderAmount: string;
}

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: string;
  name: string;
}

interface CheckoutFlowProps {
  addresses: Address[];
  slots: DeliverySlot[];
  cartItems: CartItem[];
  subtotal: number;
}

export default function CheckoutFlow({
  addresses,
  slots,
  cartItems,
  subtotal,
}: CheckoutFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Address & Recipient, 2: Slot & Coupon, 3: Review & Payment
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // Form selections
  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id || '');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) // default to tomorrow
  );
  const [slotId, setSlotId] = useState(slots[0]?.id || '');
  
  // Recipient / Gift details
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [instructions, setInstructions] = useState('');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'upi'>('cod');

  const selectedAddress = addresses.find(a => a.id === addressId);
  const selectedSlot = slots.find(s => s.id === slotId);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const checkServiceArea = (addr: Address) => {
    if (!addr.latitude || !addr.longitude) return { allowed: true, distance: null };
    const lat1 = parseFloat(addr.latitude);
    const lon1 = parseFloat(addr.longitude);
    
    // Store Hub coordinates (Kurmannapalem Central Hub, Visakhapatnam)
    const HUB_LAT = 17.6784;
    const HUB_LNG = 83.1678;
    
    const distance = calculateDistance(HUB_LAT, HUB_LNG, lat1, lon1);
    return {
      allowed: distance <= 5.0,
      distance: distance.toFixed(2)
    };
  };

  const selectedAddressService = selectedAddress ? checkServiceArea(selectedAddress) : { allowed: true, distance: null };

  // Calculate totals
  const deliveryCharge = subtotal > 499 || subtotal === 0 ? 0 : parseFloat(selectedSlot?.deliveryCharge || '49');
  const packagingFee = subtotal > 0 ? 15 : 0;
  const convenienceFee = 5;
  const gstTax = subtotal - (subtotal / 1.05); // 5% inclusive GST
  const total = subtotal + deliveryCharge + packagingFee + convenienceFee - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          subtotal: subtotal,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setDiscount(parseFloat(json.data.discountAmount));
        setCouponApplied(true);
      } else {
        setCouponError(json.message || 'Invalid or expired coupon code');
      }
    } catch (e) {
      setCouponError('Error verifying coupon');
    }
  };

  const handleClearCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setCouponApplied(false);
    setCouponError('');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setErrorMsg('');

    const payload = {
      addressId,
      deliverySlotId: slotId,
      deliveryDate,
      couponCode: couponApplied ? couponCode : null,
      isGift,
      recipientName: isGift ? recipientName : null,
      recipientMobile: isGift ? recipientMobile : null,
      giftMessage: isGift ? giftMessage : null,
      deliveryInstructions: instructions || null,
      paymentMethod,
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessOrder(json.data);
        window.dispatchEvent(new Event('cart-updated'));
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        if (json.code === 'OUT_OF_STOCK' && json.data?.cartItemId) {
          const confirmRemove = window.confirm(
            `${json.message} Would you like to remove this item from your cart so you can proceed to checkout with the remaining items?`
          );
          if (confirmRemove) {
            try {
              setLoading(true);
              const deleteRes = await fetch(`/api/cart?id=${json.data.cartItemId}`, {
                method: 'DELETE',
              });
              if (deleteRes.ok) {
                router.refresh();
                setErrorMsg('Item removed from your cart. Please review your order summary and click "Place Order" again.');
              } else {
                setErrorMsg('Failed to remove the item from your cart. Please try manually.');
              }
            } catch (err) {
              setErrorMsg('Error removing item from cart.');
            } finally {
              setLoading(false);
            }
          } else {
            setErrorMsg(json.message);
          }
        } else {
          setErrorMsg(json.message || 'Failed to place order');
        }
      }
    } catch (e) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 5. SUCCESS RENDER SCREEN
  if (successOrder) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center flex flex-col items-center justify-center min-h-[450px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 animate-pulse">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="mt-6 text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Order Placed Successfully!</h2>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-semibold">
          Your order <span className="text-zinc-800 dark:text-zinc-200 font-extrabold">{successOrder.orderNumber}</span> has been confirmed. You will receive WhatsApp notifications shortly.
        </p>

        <div className="mt-8 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900 w-full text-left flex flex-col gap-2.5 shadow-sm text-xs">
          <div className="flex justify-between font-semibold text-zinc-500">
            <span>Payment Mode:</span>
            <span className="text-zinc-900 dark:text-zinc-100 uppercase font-extrabold">{successOrder.paymentMethod}</span>
          </div>
          <div className="flex justify-between font-semibold text-zinc-500">
            <span>Delivery Date:</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{successOrder.deliveryDate}</span>
          </div>
          <div className="flex justify-between font-semibold text-zinc-500">
            <span>Total Paid:</span>
            <span className="text-emerald-500 font-extrabold text-sm">₹{parseFloat(successOrder.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-4 w-full mt-10">
          <Link
            href={`/tracking/${successOrder.id}`}
            className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-4 shadow-md transition-colors text-center"
          >
            Track Order
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-black py-4 transition-colors text-center dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight mb-8">Checkout</h1>

      {errorMsg && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2 dark:bg-rose-950/20 dark:border-rose-900/30">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* CHECKOUT STEPS LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* STEP 1: ADDRESS & RECIPIENT */}
          {step === 1 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black text-white">1</span>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Delivery Address</h3>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-zinc-500 mb-4">Please add a shipping address to proceed.</p>
                  <Link 
                    href="/account/addresses" 
                    className="rounded-full bg-emerald-500 text-white text-xs font-bold px-6 py-2.5"
                  >
                    Add Address
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {addresses.map((addr) => (
                    <label 
                      key={addr.id}
                      className={`relative flex items-start gap-3 rounded-2xl border p-4 cursor-pointer select-none transition-all ${
                        addressId === addr.id
                          ? 'border-emerald-500 bg-emerald-50/10'
                          : 'border-zinc-200 dark:border-zinc-850'
                      }`}
                    >
                      <input
                        type="radio"
                        name="checkout_address"
                        checked={addressId === addr.id}
                        onChange={() => setAddressId(addr.id)}
                        className="mt-1 h-4.5 w-4.5 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex flex-col gap-1 pr-6">
                        <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50">
                          {addr.recipientName} ({addr.addressType.toUpperCase()})
                        </span>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-normal font-medium">
                          {addr.houseFlat}, {addr.building && `${addr.building}, `}{addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    </label>
                  ))}

                  {/* Recipient Switcher Toggle (Order for Someone Else) */}
                  <div className="mt-4 border-t border-zinc-50 dark:border-zinc-800 pt-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Is this a gift or order for someone else?</h4>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">We will notify the recipient directly about shipment deliveries</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isGift}
                          onChange={(e) => setIsGift(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {isGift && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 animate-fade-in">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold uppercase text-zinc-500">Recipient Name</label>
                          <input
                            type="text"
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold uppercase text-zinc-500">Recipient Mobile</label>
                          <input
                            type="tel"
                            required
                            value={recipientMobile}
                            onChange={(e) => setRecipientMobile(e.target.value)}
                            placeholder="+919999999999"
                            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold uppercase text-zinc-500">Gift Message (Optional)</label>
                          <textarea
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            placeholder="Write a sweet message to print on card..."
                            className="h-16 rounded-lg border border-zinc-200 bg-white p-2 text-xs outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Service Area Check Result */}
                  {selectedAddress && (
                    <div className="mt-4">
                      {!selectedAddress.latitude || !selectedAddress.longitude ? (
                        <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl text-zinc-500 text-[11px] font-semibold">
                          ⚠️ Address coordinates not mapped. Geolocation area verification skipped.
                        </div>
                      ) : !selectedAddressService.allowed ? (
                        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-505 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold text-[12px]">No service in your address</p>
                            <p className="text-[10px] text-rose-500 mt-0.5 leading-relaxed">
                              Your address is located {selectedAddressService.distance} km away from our Kurmannapalem Central Hub. Our delivery coverage is restricted to a maximum 5 km radius. We regret the inconvenience.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-emerald-50/30 border border-emerald-100 rounded-xl text-emerald-700 text-[11px] font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span>Within Service Area (Distance: {selectedAddressService.distance} km)</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setStep(2)}
                    disabled={!addressId || !selectedAddressService.allowed}
                    className="mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-3.5 shadow-md flex items-center justify-center gap-1.5 self-end px-8 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    Next Step
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SLOT & COUPON */}
          {step === 2 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black text-white">2</span>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Delivery Details & Coupon</h3>
              </div>

              {/* Delivery Date Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  Select Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="h-10 rounded-lg border border-zinc-200 px-3 text-xs font-semibold outline-none focus:border-emerald-500 dark:border-zinc-850 dark:bg-zinc-950 dark:text-zinc-200 max-w-[200px]"
                />
              </div>

              {/* Delivery slots selection */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  Select Delivery Slot
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((s) => {
                    const isSelected = slotId === s.id;
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer select-none transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/10'
                            : 'border-zinc-200 dark:border-zinc-850'
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkout_slot"
                          checked={isSelected}
                          onChange={() => setSlotId(s.id)}
                          className="h-4.5 w-4.5 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                            {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">
                            Charge: ₹{parseFloat(s.deliveryCharge) === 0 ? 'FREE' : parseFloat(s.deliveryCharge)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Coupon Form inside step */}
              <div className="border-t border-zinc-50 dark:border-zinc-800 pt-5 flex flex-col gap-3">
                <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <Tag className="h-4 w-4 text-emerald-500" />
                  Apply Discount Coupon
                </label>
                
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-900/30">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">Coupon Code APPLIED</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold mt-0.5">Discount: -₹{discount.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={handleClearCoupon}
                      className="text-xs font-bold text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter WELCOME100, DAILYMILK..."
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="h-10 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-850 dark:bg-zinc-950 uppercase font-mono max-w-[250px]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold px-6"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && (
                  <span className="text-[10px] font-semibold text-rose-500">{couponError}</span>
                )}
              </div>

              <div className="flex justify-between items-center mt-6 border-t border-zinc-50 dark:border-zinc-800 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold py-3.5 px-6 flex items-center gap-1"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  Back
                </button>
                
                <button
                  onClick={() => setStep(3)}
                  disabled={!slotId}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-3.5 px-6 flex items-center gap-1"
                >
                  Next Step
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & PAYMENT */}
          {step === 3 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black text-white">3</span>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Select Payment Method</h3>
              </div>

              {/* Delivery Slot info check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Shipping To</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {selectedAddress?.recipientName} - {selectedAddress?.houseFlat}, {selectedAddress?.street}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Delivery Slot</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {deliveryDate} ({selectedSlot?.startTime.slice(0, 5)} - {selectedSlot?.endTime.slice(0, 5)})
                  </p>
                </div>
              </div>

              {/* Payment Methods Choice */}
              <div className="flex flex-col gap-3">
                {/* Cash on Delivery */}
                <label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer select-none transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-emerald-500 bg-emerald-50/10'
                    : 'border-zinc-200 dark:border-zinc-850'
                }`}>
                  <input
                    type="radio"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="h-4.5 w-4.5 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Pay with cash or UPI at the time of delivery</span>
                  </div>
                </label>

                {/* UPI / Card placeholders (Ready architecture) */}
                <label className={`flex items-center gap-3 rounded-2xl border p-4 opacity-70 cursor-pointer select-none transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-emerald-500 bg-emerald-50/10'
                    : 'border-zinc-200 dark:border-zinc-850'
                }`}>
                  <input
                    type="radio"
                    checked={paymentMethod === 'upi'}
                    disabled
                    onChange={() => undefined}
                    className="h-4.5 w-4.5 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      Instant UPI (GPay, PhonePe, Paytm)
                      <span className="rounded bg-emerald-50 px-1 py-0.5 text-[8px] text-emerald-600 font-black">POPULAR</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Coming soon after payment gateway certification</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 rounded-2xl border p-4 opacity-70 cursor-pointer select-none transition-all ${
                  paymentMethod === 'card'
                    ? 'border-emerald-500 bg-emerald-50/10'
                    : 'border-zinc-200 dark:border-zinc-850'
                }`}>
                  <input
                    type="radio"
                    checked={paymentMethod === 'card'}
                    disabled
                    onChange={() => undefined}
                    className="h-4.5 w-4.5 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                      Credit / Debit Card
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Coming soon after payment gateway certification</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-between items-center mt-6 border-t border-zinc-50 dark:border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold py-3.5 px-6 flex items-center gap-1"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  Back
                </button>
                
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePlaceOrder}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-4 px-8 shadow-md flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Place Order (₹{total.toFixed(2)})
                </button>
              </div>
            </div>
          )}

        </div>

        {/* SUMMARY CARD RIGHT COLUMN */}
        <div className="flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider pb-3 border-b border-zinc-100 dark:border-zinc-800">
            Items in Order
          </h3>

          <div className="overflow-x-auto max-h-56 overflow-y-auto pr-1 no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  <th className="py-2 pr-1.5">Sl.</th>
                  <th className="py-2 pr-1.5">Item Name</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-center">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40 text-[11px] font-semibold text-zinc-550 dark:text-zinc-400">
                {cartItems.map((item, index) => {
                  const rate = parseFloat(item.price);
                  const amount = rate * item.quantity;
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-1.5 text-zinc-400">{index + 1}</td>
                      <td className="py-2.5 pr-1.5 font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[90px] sm:max-w-[125px]" title={item.name}>
                        {item.name}
                      </td>
                      <td className="py-2.5 text-center font-black text-zinc-900 dark:text-zinc-100">{item.quantity}</td>
                      <td className="py-2.5 text-center">₹{rate.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-black text-zinc-900 dark:text-zinc-100">₹{amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-50 dark:border-zinc-800 pt-4 flex flex-col gap-3 text-xs font-semibold text-zinc-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-extrabold">₹{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-500">
                <span>Coupon Discount</span>
                <span>-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                {deliveryCharge === 0 ? <span className="text-emerald-500">FREE</span> : `₹${deliveryCharge.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Packaging & Tech Fees</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">₹{(packagingFee + convenienceFee).toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-150 pt-4 dark:border-zinc-800 flex justify-between text-sm font-black text-zinc-900 dark:text-zinc-100">
              <span>Order Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
