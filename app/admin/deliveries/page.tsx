import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders, drivers, users, deliveries } from '@/lib/db/schema';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import DeliveriesManager from '@/components/admin/DeliveriesManager';

export const dynamic = 'force-dynamic';

export default async function AdminDeliveriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/deliveries');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager', 'Delivery Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // 1. Fetch active orders waiting for dispatch
  const readyOrders = await db.query.orders.findMany({
    where: inArray(orders.status, ['confirmed', 'preparing', 'ready_for_dispatch']),
    orderBy: desc(orders.createdAt),
  });

  const mappedReadyOrders = readyOrders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    recipientName: o.recipientName || 'Customer',
    status: o.status,
  }));

  // 2. Fetch active drivers (using standard join to grab names)
  const activeDriversList = await db
    .select({
      id: drivers.id,
      driverName: users.name,
      vehicleNumber: drivers.vehicleNumber,
      vehicleType: drivers.vehicleType,
      status: drivers.status,
    })
    .from(drivers)
    .innerJoin(users, eq(drivers.userId, users.id))
    .where(eq(drivers.status, 'active'));

  const mappedDrivers = activeDriversList.map(d => ({
    id: d.id,
    driverName: d.driverName || 'Driver',
    vehicleNumber: d.vehicleNumber,
    vehicleType: d.vehicleType,
    status: d.status,
  }));

  // 3. Fetch active delivery runs
  const activeRuns = await db
    .select({
      id: deliveries.id,
      deliveryNumber: deliveries.deliveryNumber,
      status: deliveries.status,
      otpCode: deliveries.otpConfirmationCode,
      createdAt: deliveries.createdAt,
      orderNumber: orders.orderNumber,
      recipientName: orders.recipientName,
      driverName: users.name,
      vehicleNumber: drivers.vehicleNumber,
    })
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .innerJoin(drivers, eq(deliveries.driverId, drivers.id))
    .innerJoin(users, eq(drivers.userId, users.id))
    .orderBy(desc(deliveries.createdAt));

  const mappedRuns = activeRuns.map(r => ({
    id: r.id,
    deliveryNumber: r.deliveryNumber,
    status: r.status,
    otpCode: r.otpCode,
    createdAt: r.createdAt.toISOString(),
    orderNumber: r.orderNumber,
    recipientName: r.recipientName || 'Customer',
    driverName: r.driverName || 'Driver',
    vehicleNumber: r.vehicleNumber,
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <DeliveriesManager 
        activeOrders={mappedReadyOrders}
        activeDrivers={mappedDrivers}
        activeDeliveries={mappedRuns}
      />
    </div>
  );
}
