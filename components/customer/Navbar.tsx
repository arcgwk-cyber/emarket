'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, User, MapPin, Shield, X, Check } from 'lucide-react';

interface NavbarProps {
  isAdmin?: boolean;
  username?: string | null;
}

export default function Navbar({ isAdmin = false, username = null }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  // Location States
  const [selectedLocation, setSelectedLocation] = useState('New Delhi');
  const [locationsList, setLocationsList] = useState<string[]>([
    'New Delhi', 'Noida', 'Gurugram', 'Faridabad', 'Ghaziabad'
  ]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const updateCartCount = async () => {
    if (username) {
      try {
        const res = await fetch('/api/cart');
        const json = await res.json();
        if (res.ok && json.success) {
          const totalQty = json.data.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartCount(totalQty);
        }
      } catch (err) {
        console.error('Error fetching cart count:', err);
      }
    } else {
      const guestCart = localStorage.getItem('guest_cart');
      if (guestCart) {
        try {
          const items = JSON.parse(guestCart);
          const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartCount(totalQty);
        } catch (e) {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    }
  };

  const fetchServiceLocations = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (res.ok && json.success && json.data.locations) {
        setLocationsList(json.data.locations);
        
        // Match default location from config if stored value is invalid
        const stored = localStorage.getItem('selected_location');
        if (stored && json.data.locations.includes(stored)) {
          setSelectedLocation(stored);
        } else if (json.data.locations.length > 0) {
          setSelectedLocation(json.data.locations[0]);
          localStorage.setItem('selected_location', json.data.locations[0]);
        }
      }
    } catch (err) {
      console.error('Error loading service locations:', err);
    }
  };

  useEffect(() => {
    // Load initial values
    const storedLoc = localStorage.getItem('selected_location');
    if (storedLoc) {
      setSelectedLocation(storedLoc);
    }
    
    updateCartCount();
    fetchServiceLocations();

    // Listeners
    window.addEventListener('cart-updated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener('cart-updated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, [username]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-100 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 shadow-sm transition-all duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Logo & Location */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 active:scale-95 transition-transform">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
              E-Market
            </span>
          </Link>
          
          {/* Actionable Location Selector */}
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1 rounded-full border border-zinc-100 px-2.5 py-1.5 text-[10px] sm:text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors max-w-[110px] sm:max-w-[160px]"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="font-semibold truncate">{selectedLocation}</span>
          </button>
        </div>

        {/* Center Search Bar */}
        <div className="hidden max-w-md flex-1 px-8 md:flex">
          <div className="relative w-full">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search grocery, meat, dairy, fresh meals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-4">
          {/* Admin link if has roles */}
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 md:flex hover:underline"
            >
              <Shield className="h-4 w-4" />
              Admin Portal
            </Link>
          )}

          {/* User Account */}
          <Link
            href={username ? "/account" : "/login"}
            className="flex items-center gap-1.5 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 p-1.5 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            {username && (
              <span className="hidden text-xs font-bold md:inline-block max-w-[100px] truncate">
                {username}
              </span>
            )}
          </Link>

          {/* Cart with badge */}
          <Link
            href="/cart"
            className="relative rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 p-2 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-95"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm leading-none">
                {cartCount}
              </span>
            )}
          </Link>
          
        </div>
      </div>

      {/* Modern Location Selector Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-sans animate-fade-in">
          <div 
            onClick={() => setIsLocationModalOpen(false)}
            className="fixed inset-0 cursor-default"
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-zoom-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Select Delivery Area</h3>
              <button 
                onClick={() => setIsLocationModalOpen(false)}
                className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 text-zinc-400 hover:text-zinc-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Select your city below to confirm delivery slot availability and active grocery stock limits.
            </p>

            <div className="mt-4 flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto no-scrollbar">
              {locationsList.map((loc) => {
                const isSelected = selectedLocation === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => {
                      setSelectedLocation(loc);
                      localStorage.setItem('selected_location', loc);
                      window.dispatchEvent(new Event('location-updated'));
                      setIsLocationModalOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all hover:bg-zinc-50 dark:hover:bg-zinc-850 ${
                      isSelected
                        ? 'text-emerald-600 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-950/10'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={`h-4 w-4 ${isSelected ? 'text-emerald-500' : 'text-zinc-400'}`} />
                      <span>{loc}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
