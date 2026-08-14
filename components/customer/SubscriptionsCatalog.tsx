'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Calendar, Clock, MapPin, Check, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: string;
}

interface Address {
  id: string;
  recipientName: string;
  houseFlat: string;
  street: string;
  city: string;
  pincode: string;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

interface SubscriptionsCatalogProps {
  plans: Plan[];
  addresses: Address[];
  slots: Slot[];
  isLoggedIn: boolean;
}

export default function SubscriptionsCatalog({
  plans,
  addresses,
  slots,
  isLoggedIn,
}: SubscriptionsCatalogProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Form states
  const [addressId, setAddressId] = useState(addresses[0]?.id || '');
  const [slotId, setSlotId] = useState(slots[0]?.id || '');
  const [weekday, setWeekday] = useState<number>(3); // Default Wednesday (3)

  const handleOpenSubscribe = (plan: Plan) => {
    if (!isLoggedIn) {
      router.push('/login?redirect=/subscriptions');
      return;
    }
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !addressId || !slotId) {
      setErrorMsg('Please select an address and delivery slot');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          deliveryWeekday: weekday,
          deliveryTimeSlotId: slotId,
          shippingAddressId: addressId,
          paymentMethod: 'cod',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccess(true);
      } else {
        setErrorMsg(json.message || 'Failed to start subscription');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatSlot = (startTime: string, endTime: string) => {
    const formatTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const weekdays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Marketing Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4">
          <Sparkles className="h-3 w-3 animate-spin" /> Custom Weekly Baskets
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mb-4">
          Fresh Seasonal Vegetables Subscriptions
        </h1>
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Skip the grocery run! Get farm-fresh seasonal veggies custom-packaged and delivered to your doorstep every week. Pause or customize selections anytime.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan) => {
          const isMedium = plan.name.includes('Medium');
          const isModerate = plan.name.includes('Moderate');
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border bg-white dark:bg-zinc-900 p-8 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                isMedium 
                  ? 'border-emerald-500 dark:border-emerald-500 scale-102 ring-2 ring-emerald-500/10'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {isMedium && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-sm">
                  Most Popular
                </span>
              )}
              
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 mb-2 leading-tight">
                  {plan.name.replace(' Weekly Basket', '')}
                </h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">₹{parseFloat(plan.price).toFixed(0)}</span>
                  <span className="text-xs font-bold text-zinc-400">/ week</span>
                </div>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                  {plan.description}
                </p>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 flex flex-col gap-3 mb-8">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Fixed Essentials: Onion, Tomato, Chillies</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Garnish Choices: Lemon / Herbs</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Seasonal Veggies: {isMedium ? '4 items' : isModerate ? '5 items' : '3 items'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Cooking Veggies: {isMedium ? '3 items' : isModerate ? '4 items' : '2 items'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Leafy Greens: {isMedium ? '3 items' : isModerate ? '4 items' : '2 items'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unlocks Spin-Wheel after 4 weeks! 🎁</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenSubscribe(plan)}
                className={`w-full py-4 text-xs font-black rounded-2xl tracking-wide shadow-sm active:scale-[0.98] transition-all cursor-pointer ${
                  isMedium
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700'
                }`}
              >
                Subscribe Now
              </button>
            </div>
          );
        })}
      </div>

      {/* Subscribe Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">{selectedPlan.name}</h3>
                <p className="text-xs font-bold text-emerald-500 mt-1">Weekly Subscription Setup</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 flex items-center justify-center text-zinc-400 hover:text-zinc-650 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center animate-bounce">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-black text-zinc-900 dark:text-zinc-50">Successfully Subscribed!</h4>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                  Your weekly basket has been active. You can customize your vegetable choices for the first delivery in your Account Settings.
                </p>
                <div className="flex gap-4 w-full mt-6">
                  <Link
                    href="/account/subscriptions"
                    className="flex-1 py-3.5 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-600 text-center"
                  >
                    Manage Subscriptions
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSuccess(false);
                      router.refresh();
                    }}
                    className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Error Banner */}
                {errorMsg && (
                  <div className="bg-red-50 text-red-500 p-3.5 rounded-2xl text-xs font-bold border border-red-200/50">
                    {errorMsg}
                  </div>
                )}

                {/* Weekday Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Preferred Delivery Day</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 3, label: 'Wed' },
                      { value: 6, label: 'Sat' },
                      { value: 0, label: 'Sun' },
                      { value: 1, label: 'Mon' },
                    ].map((day) => {
                      const isSel = weekday === day.value;
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setWeekday(day.value)}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSel 
                              ? 'border-emerald-500 text-emerald-500 bg-emerald-50/10 border-2'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Delivery Time Slot</label>
                  <div className="flex flex-col gap-2">
                    {slots.map((slot) => {
                      const isSel = slotId === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSlotId(slot.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSel
                              ? 'border-emerald-500 bg-emerald-50/5 text-emerald-600 dark:text-emerald-400 border-2'
                              : 'border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:border-zinc-850 dark:text-zinc-300'
                          }`}
                        >
                          <span className="text-xs font-semibold">Morning Slot</span>
                          <span className="text-xs font-black">{formatSlot(slot.startTime, slot.endTime)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Shipping Address</label>
                    <Link
                      href="/account/addresses"
                      className="text-[10px] font-black text-emerald-500 hover:underline"
                    >
                      + Add New
                    </Link>
                  </div>
                  {addresses.length === 0 ? (
                    <div className="p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                      <p className="text-xs font-semibold text-zinc-400 mb-2">No saved addresses found</p>
                      <Link
                        href="/account/addresses"
                        className="inline-flex items-center gap-1 text-xs font-black text-emerald-500"
                      >
                        <Plus className="h-3 w-3" /> Add Address
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                      {addresses.map((addr) => {
                        const isSel = addressId === addr.id;
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => setAddressId(addr.id)}
                            className={`w-full p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                              isSel
                                ? 'border-emerald-500 bg-emerald-50/5 border-2'
                                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-855'
                            }`}
                          >
                            <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                            <div className="text-xs">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">{addr.recipientName}</p>
                              <p className="text-zinc-500 font-medium truncate max-w-[320px]">
                                {addr.houseFlat}, {addr.street}, {addr.city} - {addr.pincode}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading || addresses.length === 0}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black tracking-wide shadow-md hover:bg-emerald-600 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Starting Subscription...
                    </>
                  ) : (
                    'Confirm Subscription (Pay COD Weekly)'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
