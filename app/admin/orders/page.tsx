import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import OrdersDashboard from '@/components/admin/OrdersDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/orders');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager', 'Order Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // Fetch all orders with shipping address, nested items and catalog details
  const allOrdersList = await db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    with: {
      shippingAddress: true,
      items: {
        with: {
          product: true,
          variant: true,
        },
      },
    },
  });

  // Map database entries to match UI prop formats
  const mappedOrders = allOrdersList.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt.toISOString(),
    totalAmount: o.totalAmount,
    recipientName: o.recipientName || 'Customer',
    recipientMobile: o.recipientMobile || '—',
    deliveryDate: o.deliveryDate,
    deliveryInstructions: o.deliveryInstructions,
    shippingAddress: o.shippingAddress ? {
      houseFlat: o.shippingAddress.houseFlat,
      building: o.shippingAddress.building || null,
      street: o.shippingAddress.street,
      area: o.shippingAddress.area || null,
      landmark: o.shippingAddress.landmark || null,
      city: o.shippingAddress.city,
      state: o.shippingAddress.state,
      pincode: o.shippingAddress.pincode,
    } : null,
    items: o.items.map(i => ({
      id: i.id,
      quantity: i.quantity,
      price: i.price,
      finalPrice: i.finalPrice,
      product: {
        name: i.product.name,
      },
      variant: i.variant ? {
        name: i.variant.name,
      } : null,
    })),
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <OrdersDashboard initialOrders={mappedOrders} />
    </div>
  );
}
