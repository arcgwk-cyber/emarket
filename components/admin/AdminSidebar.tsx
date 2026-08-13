'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Tag, 
  FolderTree, 
  ClipboardList, 
  Truck, 
  Utensils, 
  Settings, 
  Home, 
  Menu, 
  X, 
  LogOut,
  ShieldAlert,
  User,
  Ticket,
  RefreshCw,
  PackagePlus
} from 'lucide-react';

interface AdminSidebarProps {
  user: {
    name: string;
    email: string;
    roles: string[];
  };
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products Catalog', href: '/admin/products', icon: Tag },
    { name: 'Categories Hierarchy', href: '/admin/categories', icon: FolderTree },
    { name: 'Order Management', href: '/admin/orders', icon: ClipboardList },
    { name: 'Delivery Dispatch', href: '/admin/deliveries', icon: Truck },
    { name: 'Cloud Kitchen Board', href: '/admin/kitchen', icon: Utensils },
    { name: 'Coupons & Promos', href: '/admin/coupons', icon: Ticket },
    { name: 'Returns & Refunds', href: '/admin/returns', icon: RefreshCw },
    { name: 'Bulk Stock Inward', href: '/admin/inward', icon: PackagePlus },
    { name: 'Platform Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      } else {
        alert('Failed to logout');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden h-14 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-4 sticky top-0 z-30 font-sans">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-500"
          >
            <Menu className="h-5.5 w-5.5" />
          </button>
          <span className="font-black text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            E-Market Admin
          </span>
        </div>
        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-45 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 font-sans ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Upper Brand Info */}
        <div className="p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <span className="font-black text-sm uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
                Admin Portal
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 rounded-full hover:bg-zinc-50 text-zinc-400 hover:text-zinc-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    active 
                      ? 'bg-emerald-500 text-white shadow-md' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-850'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lower Profile & Exit */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/10">
          
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-650 dark:text-zinc-300">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate leading-snug">
                {user.name}
              </p>
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate leading-none mt-0.5">
                {user.roles[0] || 'Super Admin'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="rounded-xl border border-zinc-200 dark:border-zinc-750 hover:bg-white dark:hover:bg-zinc-900 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black text-zinc-500 hover:text-zinc-900 dark:text-zinc-405 dark:hover:text-zinc-200 transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Store
            </Link>

            <button
              onClick={handleSignOut}
              className="rounded-xl border border-rose-100 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black text-rose-500 transition-colors cursor-pointer dark:border-rose-950/20 dark:hover:bg-rose-950/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>

        </div>

      </aside>
    </>
  );
}
