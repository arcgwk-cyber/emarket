'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default prompt
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If running in standalone mode (already installed), do not show
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setShowBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Trigger prompt
    deferredPrompt.prompt();
    
    // Wait for choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install: ${outcome}`);
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-sm md:bottom-6 md:right-6 md:left-auto rounded-xl border border-emerald-100 bg-white/95 p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/95 glass transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-extrabold text-sm shadow-md">
            EM
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Install E-Market App
            </h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
              Order fresh food & groceries directly from your home screen with offline fallback.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowBanner(false)} 
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={handleInstallClick}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[11px] font-bold text-white py-2 shadow-sm transition-all duration-200 active:scale-95"
      >
        <Download className="h-3.5 w-3.5" />
        Add to Home Screen
      </button>
    </div>
  );
}
