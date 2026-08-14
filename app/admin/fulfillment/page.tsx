import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders, deliveries, drivers, users, deliverySlots } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import FulfillmentHub from '@/components/admin/FulfillmentHub';

export const dynamic = 'force-dynamic';

export default async function AdminFulfillmentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/fulfillment');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager', 'Order Manager', 'Kitchen Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // 1. Fetch orders in progress of packing & dispatch
  const activeOrders = await db.query.orders.findMany({
    where: inArray(orders.status, ['confirmed', 'preparing', 'ready_for_dispatch']),
    orderBy: desc(orders.createdAt),
    with: {
      deliverySlot: true,
      shippingAddress: true,
      items: {
        with: {
          product: true,
          variant: true,
        }
      }
    }
  });

  // 2. Fetch driver assignments for these orders
  const activeRuns = await db
    .select({
      orderId: deliveries.orderId,
      driverName: users.name,
      vehicleNumber: drivers.vehicleNumber,
    })
    .from(deliveries)
    .innerJoin(drivers, eq(deliveries.driverId, drivers.id))
    .innerJoin(users, eq(drivers.userId, users.id));

  // Create a fast lookup map for driver assignments
  const driverMap = new Map<string, { driverName: string; vehicleNumber: string }>();
  activeRuns.forEach(run => {
    if (run.orderId) {
      driverMap.set(run.orderId, {
        driverName: run.driverName || 'Driver',
        vehicleNumber: run.vehicleNumber || '—',
      });
    }
  });

  // 3. Map orders data for UI
  const mappedOrders = activeOrders.map(o => {
    const driverInfo = driverMap.get(o.id);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      recipientName: o.recipientName || 'Customer',
      recipientMobile: o.recipientMobile || '—',
      createdAt: o.createdAt.toISOString(),
      totalAmount: o.totalAmount,
      deliverySlotName: o.deliverySlot ? `${o.deliverySlot.startTime} - ${o.deliverySlot.endTime}` : 'Standard Delivery',
      driverName: driverInfo?.driverName || 'Not Assigned Yet',
      vehicleNumber: driverInfo?.vehicleNumber || '—',
      items: o.items.map(i => ({
        id: i.id,
        quantity: i.quantity,
        productName: i.product.name,
        variantName: i.variant ? i.variant.name : null,
        image: i.product.images?.[0] || 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&auto=format&fit=crop&q=80',
        weight: i.product.weightG ? `${i.product.weightG}g` : i.product.stockType || 'unit',
      })),
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <FulfillmentHub initialOrders={mappedOrders} />
    </div>
  );
}
