'use client';

import React from 'react';
import { WifiOff, RotateCw, PhoneCall, Mail } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center font-sans dark:bg-zinc-950">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400">
          <WifiOff className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          No Internet Connection
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          It looks like you are offline. Please check your network and try again to access our grocery and cloud kitchen store.
        </p>

        <button
          onClick={handleRetry}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <RotateCw className="h-5 w-5" />
          Try Again
        </button>

        <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Need urgent help with an active order?
          </p>
          <div className="mt-3 flex justify-center gap-6 text-zinc-600 dark:text-zinc-400">
            <a href="tel:+919999999999" className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
              <PhoneCall className="h-4 w-4" />
              <span className="text-sm">Call Support</span>
            </a>
            <a href="mailto:support@emarket.com" className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
              <Mail className="h-4 w-4" />
              <span className="text-sm">Email Support</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
