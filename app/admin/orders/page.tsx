import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import OrdersDashboard from '@/components/admin/OrdersDashboard';

export const dynamic = 'force-dynamic';

interface AdminOrdersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
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

  const params = await searchParams;
  const q = params.q || '';
  const status = params.status || 'all';
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build query conditions
  const conditions: any[] = [];
  if (q.trim()) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${q}%`),
        ilike(orders.recipientName, `%${q}%`),
        ilike(orders.recipientMobile, `%${q}%`)
      )
    );
  }
  
  if (status !== 'all') {
    conditions.push(eq(orders.status, status));
  }

  // Fetch paginated orders with relations
  const allOrdersList = await db.query.orders.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(orders.createdAt),
    limit,
    offset,
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

  // Fetch count
  const totalCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalCount = totalCountRes[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

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
      <OrdersDashboard 
        initialOrders={mappedOrders} 
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        initialSearch={q}
        initialStatus={status}
      />
    </div>
  );
}
