import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { orders, orderStatusHistory } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import OrderTracker from '@/components/customer/OrderTracker';
import { getCurrentUser } from '@/lib/services/auth';

interface TrackingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  // 1. Fetch matching order with all nested relationships
  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      shippingAddress: true,
      deliverySlot: true,
      items: {
        with: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!orderRecord) {
    notFound();
  }

  if (orderRecord.userId !== user.id) {
    notFound();
  }

  // 2. Fetch order status logs history in reverse chronological order
  const logs = await db.query.orderStatusHistory.findMany({
    where: eq(orderStatusHistory.orderId, orderRecord.id),
    orderBy: desc(orderStatusHistory.createdAt),
  });

  // 3. Map database properties to clean tracker schema
  const record = orderRecord as any;
  const mappedOrder = {
    id: record.id,
    orderNumber: record.orderNumber,
    status: record.status,
    deliveryDate: record.deliveryDate,
    deliveryInstructions: record.deliveryInstructions,
    totalAmount: record.totalAmount,
    recipientName: record.recipientName || '',
    recipientMobile: record.recipientMobile || '',
    paymentMethod: record.paymentMethod,
    paymentStatus: record.paymentStatus,
    shippingAddress: {
      houseFlat: record.shippingAddress?.houseFlat || '',
      street: record.shippingAddress?.street || '',
      city: record.shippingAddress?.city || '',
      pincode: record.shippingAddress?.pincode || '',
    },
    deliverySlot: {
      startTime: record.deliverySlot?.startTime || '',
      endTime: record.deliverySlot?.endTime || '',
    },
    history: logs.map((log) => ({
      id: log.id,
      status: log.status,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
    })),
    items: record.items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: { name: item.product.name },
      variant: item.variant ? { name: item.variant.name } : null,
    })),
  };

  return (
    <div className="py-10">
      <OrderTracker order={mappedOrder} />
    </div>
  );
}
