import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { subscriptions, products, subscriptionSelections } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import WeeklyCustomizer from '@/components/customer/WeeklyCustomizer';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomizeSubscriptionPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirect=/account/subscriptions');
  }

  const { id } = await params;

  // 1. Fetch user subscription
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.id, id),
      eq(subscriptions.userId, user.id)
    ),
    with: {
      plan: true,
    }
  });

  if (!sub) {
    redirect('/account/subscriptions');
  }

  // 2. Fetch tagged subscription vegetables from database
  const activeProducts = await db.query.products.findMany({
    where: and(
      isNull(products.deletedAt),
      eq(products.status, 'active')
    ),
  });

  const fixedList = activeProducts.filter(p => p.subscriptionCategory === 'fixed');
  const garnishList = activeProducts.filter(p => p.subscriptionCategory === 'garnish');
  const seasonalList = activeProducts.filter(p => p.subscriptionCategory === 'seasonal');
  const cookingList = activeProducts.filter(p => p.subscriptionCategory === 'cooking');
  const leafyList = activeProducts.filter(p => p.subscriptionCategory === 'leafy');

  // 3. Calculate next upcoming delivery date based on deliveryDays[0]
  const today = new Date();
  const deliveryWeekday = sub.deliveryDays?.[0] ?? 3; // default Wednesday
  const currentDay = today.getDay();
  let daysToAdd = deliveryWeekday - currentDay;
  if (daysToAdd <= 0) daysToAdd += 7; // next week
  const nextDelivery = new Date(today);
  nextDelivery.setDate(today.getDate() + daysToAdd);
  const nextDeliveryStr = nextDelivery.toISOString().split('T')[0];

  // 4. Fetch or initialize the user's custom selections for that delivery date
  let selectionRecord = await db.query.subscriptionSelections.findFirst({
    where: and(
      eq(subscriptionSelections.subscriptionId, sub.id),
      eq(subscriptionSelections.deliveryDate, nextDeliveryStr)
    ),
  });

  if (!selectionRecord) {
    const [newRecord] = await db.insert(subscriptionSelections).values({
      subscriptionId: sub.id,
      deliveryDate: nextDeliveryStr,
      selections: {
        garnish: [],
        seasonal: [],
        regular: [], // mapped to cooking
        leafy: []
      },
      status: 'pending',
    }).returning();
    selectionRecord = newRecord;
  }

  // 5. Determine limits based on plan properties
  const planName = sub.plan?.name ?? 'Standard Weekly Basket';
  let limits = {
    maxGarnish: 1,
    maxSeasonal: 3,
    maxCooking: 2,
    maxLeafy: 2,
  };

  if (planName.includes('Medium')) {
    limits = {
      maxGarnish: 2,
      maxSeasonal: 4,
      maxCooking: 3,
      maxLeafy: 3,
    };
  } else if (planName.includes('Moderate')) {
    limits = {
      maxGarnish: 3,
      maxSeasonal: 5,
      maxCooking: 4,
      maxLeafy: 4,
    };
  }

  // Map database jsonb selections to matching interface object
  const dbSelections = (selectionRecord.selections as any) || {};
  const mappedSelections = {
    garnish: dbSelections.garnish || [],
    seasonal: dbSelections.seasonal || [],
    cooking: dbSelections.regular || dbSelections.cooking || [], // fallback mappings
    leafy: dbSelections.leafy || [],
  };

  return (
    <div className="py-6">
      <WeeklyCustomizer
        subscriptionId={sub.id}
        planName={planName}
        deliveryDate={nextDeliveryStr}
        limits={limits}
        initialSelections={mappedSelections}
        fixedList={fixedList.map(p => ({
          id: p.id,
          name: p.name,
          images: p.images,
          stockType: p.stockType,
          weightG: p.weightG,
        }))}
        garnishList={garnishList.map(p => ({
          id: p.id,
          name: p.name,
          images: p.images,
          stockType: p.stockType,
          weightG: p.weightG,
        }))}
        seasonalList={seasonalList.map(p => ({
          id: p.id,
          name: p.name,
          images: p.images,
          stockType: p.stockType,
          weightG: p.weightG,
        }))}
        cookingList={cookingList.map(p => ({
          id: p.id,
          name: p.name,
          images: p.images,
          stockType: p.stockType,
          weightG: p.weightG,
        }))}
        leafyList={leafyList.map(p => ({
          id: p.id,
          name: p.name,
          images: p.images,
          stockType: p.stockType,
          weightG: p.weightG,
        }))}
      />
    </div>
  );
}
