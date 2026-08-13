import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ChevronRight, ArrowRight, Package, Calendar, Tag, CreditCard } from 'lucide-react';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/account/orders');
  }

  // Fetch orders with nested items, product details and status history
  const list = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    orderBy: desc(orders.createdAt),
    with: {
      items: {
        with: {
          product: true,
          variant: true,
        },
      },
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      case 'confirmed':
      case 'preparing':
      case 'ready_for_dispatch':
      case 'out_for_delivery':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'delivered':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
      case 'cancelled':
      case 'failed':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      default:
        return 'bg-zinc-50 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 font-sans">
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
            <span className="text-xs font-black text-zinc-850 dark:text-zinc-200">Orders</span>
          </div>
          <h1 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Order History</h1>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 text-zinc-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">No orders placed yet</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Your shopping bag is empty. Explore categories in E-Market to purchase fresh items!
              </p>
            </div>
            <Link 
              href="/catalog" 
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 text-xs shadow-sm active:scale-95 transition-all inline-flex items-center gap-1.5"
            >
              Start Shopping
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((order) => {
              const activeTracking = ['pending', 'confirmed', 'preparing', 'ready_for_dispatch', 'out_for_delivery'].includes(order.status);
              return (
                <div 
                  key={order.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-4"
                >
                  {/* Order Top Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">
                        Order Number
                      </span>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {order.orderNumber}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 justify-end">
                      <CreditCard className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="capitalize">{order.paymentMethod} • {order.paymentStatus}</span>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="space-y-2 py-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 py-1 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-700 dark:text-zinc-300 truncate">
                            {item.product?.name}
                            {item.variant && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1.5">
                                ({item.variant.name})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                            Qty: {item.quantity} • ₹{item.price} each
                          </p>
                        </div>
                        <span className="font-black text-zinc-800 dark:text-zinc-200 shrink-0">
                          ₹{item.finalPrice}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals & Tracker link */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-50 dark:border-zinc-800">
                    <div>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wide">
                        Total Paid
                      </span>
                      <p className="text-sm font-black text-zinc-950 dark:text-zinc-50 leading-none mt-1">
                        ₹{order.totalAmount}
                      </p>
                    </div>

                    {activeTracking ? (
                      <Link
                        href={`/tracking/${order.id}`}
                        className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        Track Order
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-400">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
