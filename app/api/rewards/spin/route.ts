import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userSpinRewards, subscriptionDeliveries, subscriptions } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const PRIZES = [
  { name: 'Elegant Handbag 👜', weight: 5, sliceIndex: 0 },
  { name: 'Premium Perfume 🧴', weight: 10, sliceIndex: 1 },
  { name: 'Free Veggies (1 Week) 🥬', weight: 15, sliceIndex: 2 },
  { name: '₹50 Cash Voucher 💰', weight: 30, sliceIndex: 3 },
  { name: 'Free Express Shipping ⚡', weight: 30, sliceIndex: 4 },
  { name: 'Try Again Next Week 🍀', weight: 10, sliceIndex: 5 },
];

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 1. Calculate how many delivered subscription deliveries this user has
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

    // 2. Fetch or create userSpinRewards record
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

    if (rewardRecord.spinsAvailable <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Deliveries completed: ${deliveredCount} / 4. Complete 4 weekly deliveries to unlock the Spin Wheel!`,
          code: 'INSUFFICIENT_CREDITS',
          deliveredCount,
        },
        { status: 400 }
      );
    }

    // 3. Draw a prize based on weights
    const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = PRIZES[PRIZES.length - 1]; // fallback

    for (const prize of PRIZES) {
      if (random < prize.weight) {
        selectedPrize = prize;
        break;
      }
      random -= prize.weight;
    }

    // 4. Update rewards history and decrement spinsAvailable
    const updatedHistory = [...(rewardRecord.history as any[]), {
      prize: selectedPrize.name,
      date: new Date().toISOString().split('T')[0],
    }];

    await db.update(userSpinRewards)
      .set({
        spinsAvailable: rewardRecord.spinsAvailable - 1,
        spinsClaimed: rewardRecord.spinsClaimed + 1,
        history: updatedHistory,
        updatedAt: new Date(),
      })
      .where(eq(userSpinRewards.id, rewardRecord.id));

    return NextResponse.json({
      success: true,
      message: `Congratulations! You won: ${selectedPrize.name}`,
      data: {
        prizeName: selectedPrize.name,
        sliceIndex: selectedPrize.sliceIndex,
        spinsLeft: rewardRecord.spinsAvailable - 1,
      }
    });

  } catch (error: any) {
    console.error('Spin Wheel rewards API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
