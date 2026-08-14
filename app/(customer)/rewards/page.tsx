import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { userSpinRewards, subscriptionDeliveries, subscriptions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import SpinWheel from '@/components/customer/SpinWheel';

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirect=/rewards');
  }

  // 1. Fetch total delivered subscription delivery runs
  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptionDeliveries)
    .innerJoin(subscriptions, eq(subscriptionDeliveries.subscriptionId, subscriptions.id))
    .where(
      and(
        eq(subscriptions.userId, user.id),
        eq(subscriptionDeliveries.status, 'delivered')
      )
    );

  const deliveredCount = countRes[0]?.count || 0;
  const totalEarnedSpins = Math.floor(deliveredCount / 4);

  // 2. Fetch or create reward record
  let rewardRecord = await db.query.userSpinRewards.findFirst({
    where: eq(userSpinRewards.userId, user.id),
  });

  if (!rewardRecord) {
    const [newRecord] = await db.insert(userSpinRewards).values({
      userId: user.id,
      spinsAvailable: totalEarnedSpins,
      spinsClaimed: 0,
      history: [],
    }).returning();
    rewardRecord = newRecord;
  } else {
    // Sync spinsAvailable dynamically based on completed deliveries
    const currentAvailable = Math.max(0, totalEarnedSpins - rewardRecord.spinsClaimed);
    if (currentAvailable !== rewardRecord.spinsAvailable) {
      await db.update(userSpinRewards)
        .set({ spinsAvailable: currentAvailable })
        .where(eq(userSpinRewards.id, rewardRecord.id));
      rewardRecord.spinsAvailable = currentAvailable;
    }
  }

  return (
    <SpinWheel
      initialSpinsAvailable={rewardRecord.spinsAvailable}
      completedDeliveries={deliveredCount}
      prizeHistory={(rewardRecord.history as any[]) || []}
    />
  );
}
