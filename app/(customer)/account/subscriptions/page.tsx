import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import SubscriptionsManager from '@/components/customer/SubscriptionsManager';

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/account/subscriptions');
  }

  // Fetch active and past subscriptions
  const list = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, user.id),
    orderBy: desc(subscriptions.createdAt),
    with: {
      plan: true,
      deliverySlot: true,
      items: {
        with: {
          product: true,
          variant: true,
        },
      },
    },
  });

  // Map to match TypeScript properties
  const mappedList = list.map((sub) => ({
    id: sub.id,
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    billingFrequency: sub.billingFrequency,
    price: sub.price,
    deliveryDays: sub.deliveryDays,
    plan: sub.plan ? {
      name: sub.plan.name,
      description: sub.plan.description,
    } : null,
    deliverySlot: sub.deliverySlot ? {
      startTime: sub.deliverySlot.startTime,
      endTime: sub.deliverySlot.endTime,
    } : null,
    items: sub.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        name: item.product.name,
        images: item.product.images,
      },
      variant: item.variant ? {
        name: item.variant.name,
      } : null,
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <SubscriptionsManager initialSubscriptions={mappedList} />
    </div>
  );
}
