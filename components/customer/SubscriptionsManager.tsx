'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CreditCard, Loader2, Play, Pause, X, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionItem {
  id: string;
  quantity: number;
  product: {
    name: string;
    images?: string[] | any;
  };
  variant?: {
    name: string;
  } | null;
}

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  billingFrequency: string;
  price: string;
  deliveryDays: number[];
  plan?: {
    name: string;
    description: string | null;
  } | null;
  deliverySlot?: {
    startTime: string;
    endTime: string;
  } | null;
  items: SubscriptionItem[];
}

interface SubscriptionsManagerProps {
  initialSubscriptions: Subscription[];
}

export default function SubscriptionsManager({ initialSubscriptions }: SubscriptionsManagerProps) {
  const router = useRouter();
  const [list, setList] = useState<Subscription[]>(initialSubscriptions);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    if (updatingId) return;
    setUpdatingId(subId);

    try {
      const res = await fetch(`/api/subscriptions/${subId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setList(prev =>
          prev.map(sub => (sub.id === subId ? { ...sub, status: newStatus } : sub))
        );
        router.refresh();
      } else {
        alert(json.message || 'Failed to update subscription status');
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      alert('Network error. Failed to update subscription.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNum] || '';
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'paused':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      case 'cancelled':
      case 'expired':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
      default:
        return 'bg-zinc-50 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Link 
            href="/account" 
            className="text-xs font-bold text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Account
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-400" />
          <span className="text-xs font-black text-zinc-850 dark:text-zinc-200">Subscriptions</span>
        </div>
        <h1 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-sans">Subscriptions</h1>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 text-zinc-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-850 dark:text-zinc-200">No active subscriptions</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed font-medium">
              Automate daily deliveries of Milk, fresh Eggs, Veggies, or ready chef meal plans. Setup recurring schedules and save!
            </p>
          </div>
          <Link 
            href="/catalog" 
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 text-xs shadow-sm active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            Explore Plans
            <Sparkles className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((sub) => {
            const isLoading = updatingId === sub.id;
            return (
              <div 
                key={sub.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-4"
              >
                {/* Title and Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
                  <div>
                    <h4 className="text-sm font-black text-zinc-805 dark:text-zinc-200 leading-snug">
                      {sub.plan?.name || 'Custom Subscription'}
                    </h4>
                    {sub.plan?.description && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5 max-w-xs truncate">
                        {sub.plan.description}
                      </p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadge(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>

                {/* Subscription Details List */}
                <div className="space-y-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>
                      Schedule: {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                    </span>
                  </div>

                  {sub.deliverySlot && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span>
                        Time Slot: {formatSlot(sub.deliverySlot.startTime, sub.deliverySlot.endTime)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="capitalize">
                      ₹{sub.price} • {sub.billingFrequency} billing
                    </span>
                  </div>

                  {/* Delivery Days list */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sub.deliveryDays.map(dayNum => (
                      <span 
                        key={dayNum}
                        className="px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-850 text-[10px] font-bold text-zinc-500"
                      >
                        {getDayName(dayNum)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Subscription Items */}
                <div className="space-y-2 py-1.5 border-t border-zinc-50 dark:border-zinc-800 border-dashed">
                  {sub.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 text-xs font-bold text-zinc-750 dark:text-zinc-300">
                      <span>{item.product?.name}</span>
                      <span className="text-zinc-400 dark:text-zinc-500">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Actions Button Panel */}
                {sub.status !== 'expired' && sub.status !== 'cancelled' && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-50 dark:border-zinc-800">
                    {isLoading ? (
                      <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold py-2 px-4">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      <>
                        {sub.status === 'active' && (
                          <Link
                            href={`/account/subscriptions/${sub.id}/customize`}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                            Customize Basket
                          </Link>
                        )}

                        {sub.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, 'paused')}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-750 dark:text-zinc-300 px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pause className="h-3.5 w-3.5 text-zinc-500" />
                            Pause Schedule
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, 'active')}
                            className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 text-zinc-500" />
                            Resume Deliveries
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this subscription? You will not receive any further deliveries.')) {
                              handleUpdateStatus(sub.id, 'cancelled');
                            }
                          }}
                          className="rounded-xl border border-rose-100 hover:bg-rose-50 text-rose-600 px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer dark:border-rose-950/20 dark:hover:bg-rose-950/10"
                        >
                          <X className="h-3.5 w-3.5 text-rose-500" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
