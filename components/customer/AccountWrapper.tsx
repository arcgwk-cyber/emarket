'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, MapPin, ClipboardList, Calendar, LogOut, ChevronRight, Loader2, Mail, Phone, Shield, Gift, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface AccountWrapperProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    mobile: string | null;
    avatarUrl: string | null;
    status: string;
    roles: string[];
  };
}

export default function AccountWrapper({ user }: AccountWrapperProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (res.ok) {
        localStorage.removeItem('guest_cart');
        router.refresh();
        router.push('/');
      } else {
        alert('Logout failed. Please try again.');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const initialLetter = user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 font-sans">
      <div className="space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl font-black text-white shadow-md">
            {initialLetter}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-550 truncate leading-snug">
              {user.name || 'Member'}
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium truncate">
              {user.email}
            </p>
            {user.roles.length > 0 && (
              <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Shield className="h-3 w-3" />
                {user.roles[0]}
              </span>
            )}
          </div>
        </div>

        {/* Profile Info Details */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Profile Information</h3>
          
          <div className="flex items-center gap-3 py-1">
            <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase leading-none">Email Address</p>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1 truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase leading-none">Mobile Number</p>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                {user.mobile || 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Links */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden divide-y divide-zinc-55 dark:divide-zinc-800">
          
          <Link href="/account/orders" className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500">
                <ClipboardList className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">My Orders</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Track shipping, view order history</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/account/addresses" className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Manage Addresses</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Update, add or delete delivery points</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/account/subscriptions" className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Meal & Milk Subscriptions</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Configure daily slots, pause subscriptions</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/subscriptions" className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Weekly Veggie Subscriptions</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Customizable family baskets starting ₹249</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/rewards" className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 dark:bg-pink-950/20 text-pink-500">
                <Gift className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Spin & Win Rewards</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Earn spin credits, win handbag & perfumes</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </Link>

        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <>
              <LogOut className="h-4 w-4 text-zinc-500" />
              Sign Out Account
            </>
          )}
        </button>

      </div>
    </div>
  );
}
