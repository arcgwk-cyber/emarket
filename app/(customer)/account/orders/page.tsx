import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ChevronRight, ArrowRight, Package, Calendar, Tag, CreditCard } from 'lucide-react';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

import OrderCard from '@/components/customer/OrderCard';

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
        return 'bg-zinc-50 text-zinc-655 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const formatDate = (date: Date | string) => {
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
              // Convert types to match client side simple interface
              const cleanOrder = {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentMethod: order.paymentMethod || 'cod',
                paymentStatus: order.paymentStatus,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
                items: order.items.map(item => ({
                  id: item.id,
                  quantity: item.quantity,
                  price: item.price,
                  finalPrice: item.finalPrice,
                  product: item.product ? { id: item.product.id, name: item.product.name } : null,
                  variant: item.variant ? { id: item.variant.id, name: item.variant.name } : null
                }))
              };
              return (
                <OrderCard
                  key={order.id}
                  order={cleanOrder}
                  formatStatus={formatStatus}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
