import React from 'react';
import { db } from '@/lib/db';
import { subscriptionPlans, customerAddresses, deliverySlots } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import SubscriptionsCatalog from '@/components/customer/SubscriptionsCatalog';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();

  // 1. Fetch active plans
  const plans = await db.query.subscriptionPlans.findMany({
    where: eq(subscriptionPlans.isActive, true),
    orderBy: desc(subscriptionPlans.price),
  });

  // 2. Fetch slots
  const slots = await db.query.deliverySlots.findMany({
    where: eq(deliverySlots.isActive, true),
  });

  // 3. Fetch addresses if user is logged in
  let addresses: any[] = [];
  if (user) {
    addresses = await db.query.customerAddresses.findMany({
      where: eq(customerAddresses.userId, user.id),
      orderBy: desc(customerAddresses.createdAt),
    });
  }

  const mappedPlans = plans.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
  }));

  const mappedAddresses = addresses.map(addr => ({
    id: addr.id,
    recipientName: addr.recipientName,
    houseFlat: addr.houseFlat,
    street: addr.street,
    city: addr.city,
    pincode: addr.pincode,
  }));

  const mappedSlots = slots.map(slot => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  return (
    <SubscriptionsCatalog
      plans={mappedPlans}
      addresses={mappedAddresses}
      slots={mappedSlots}
      isLoggedIn={!!user}
    />
  );
}
