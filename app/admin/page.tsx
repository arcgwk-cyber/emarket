import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  Settings, 
  ClipboardList, 
  Truck, 
  Utensils, 
  ChevronRight,
  Shield,
  ArrowRight,
  Tag,
  FolderTree
} from 'lucide-react';
import { db } from '@/lib/db';
import { users, orders, subscriptions, products } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Verify they have an administrative or manager role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager', 'Order Manager', 'Delivery Manager', 'Kitchen Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // 1. Fetch real-time statistics
  let stats = {
    users: 0,
    orders: 0,
    subscriptions: 0,
    revenue: '0.00',
  };

  try {
    const [userRes] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [orderRes] = await db.select({ count: sql<number>`count(*)`, totalRevenue: sql<string>`sum(total_amount)` }).from(orders);
    const [subRes] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, 'active'));

    stats = {
      users: userRes?.count || 0,
      orders: orderRes?.count || 0,
      subscriptions: subRes?.count || 0,
      revenue: parseFloat(orderRes?.totalRevenue || '0').toFixed(2),
    };
  } catch (err) {
    console.error('Error loading admin dashboard stats:', err);
  }

  // 2. Fetch recent orders
  let recentOrdersList: any[] = [];
  try {
    recentOrdersList = await db.query.orders.findMany({
      orderBy: desc(orders.createdAt),
      limit: 5,
      with: {
        user: true,
      }
    });
  } catch (err) {
    console.error('Error loading recent orders:', err);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'confirmed':
      case 'preparing':
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'cancelled':
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default:
        return 'bg-zinc-50 text-zinc-650 border-zinc-100';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Title area */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Shield className="h-3.5 w-3.5" />
              Administrative Root
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-2">
              Platform Dashboard
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Hello {user.name}, manage grocery stocks, check active meal subscriptions, or dispatch orders.
            </p>
          </div>
        </div>

        {/* 1. STATS SECTION */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Total Revenue</span>
              <p className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">₹{stats.revenue}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-500">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Total Orders</span>
              <p className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">{stats.orders}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Active Subs</span>
              <p className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">{stats.subscriptions}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-500">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Registered Users</span>
              <p className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">{stats.users}</p>
            </div>
          </div>

        </div>

        {/* 2. QUICK MANAGEMENT ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Link href="/admin/products" className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                <Tag className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Product Catalog</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Manage platform items, adjust selling prices, unit MRPs, and configure featured grocery listings.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1.5 transition-transform mt-2">
              Manage Products
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link href="/admin/categories" className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                <FolderTree className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Category Hierarchy</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Create new business departments, categories, subcategories, and manage slugs.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1.5 transition-transform mt-2">
              Manage Categories
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link href="/admin/settings" className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-300">
                <Settings className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Platform Settings</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Configure delivery slots, service areas, business configurations, and app variables.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:translate-x-1.5 transition-transform mt-2">
              Manage System
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link href="/admin/orders" className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Order Management</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Track supermarket grocery orders, progress statuses, and review delivery instructions.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1.5 transition-transform mt-2">
              Manage Orders
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link href="/admin/deliveries" className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-300">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Delivery Dispatch</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Assign orders to delivery drivers, manage slot capacities, and track active dispatch runs.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:translate-x-1.5 transition-transform mt-2">
              Dispatch Orders
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link href="/admin/kitchen" className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                <Utensils className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Cloud Kitchen</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Track chef order status, prepare hot food menus, and coordinate diet meals.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1.5 transition-transform mt-2">
              Kitchen Board
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

        </div>

        {/* 3. RECENT ORDERS TABLE */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Recent Platform Orders</h3>
            <span className="text-[10px] font-bold text-zinc-400">Showing last 5</span>
          </div>

          {recentOrdersList.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No orders have been recorded in the platform database yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 pl-6">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {recentOrdersList.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                      <td className="p-4 pl-6 font-bold">{order.orderNumber}</td>
                      <td className="p-4">
                        <p className="font-bold">{order.user?.name || 'Customer'}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{order.user?.email}</p>
                      </td>
                      <td className="p-4 capitalize">
                        {order.paymentMethod} ({order.paymentStatus})
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right font-black text-zinc-950 dark:text-zinc-50">
                        ₹{order.totalAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
