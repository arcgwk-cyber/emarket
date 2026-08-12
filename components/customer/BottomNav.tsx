'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, ShoppingCart, ClipboardList, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Navigation tabs config matching PWA requirements
  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Categories', href: '/catalog', icon: Grid },
    { label: 'Cart', href: '/cart', icon: ShoppingCart, badge: 2 }, // sample badge count
    { label: 'Orders', href: '/account/orders', icon: ClipboardList },
    { label: 'Account', href: '/account', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-100 bg-white/90 pb-safe backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden shadow-lg">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-emerald-500 dark:text-emerald-400 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
