import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions, subscriptionPlans, subscriptionSelections, stores } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const subscribeSchema = z.object({
  planId: z.string().uuid(),
  deliveryWeekday: z.number().int().min(0).max(6),
  deliveryTimeSlotId: z.string().uuid(),
  shippingAddressId: z.string().uuid(),
  paymentMethod: z.string().default('cod'),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = subscribeSchema.parse(body);

    // 1. Get plan details
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, validated.planId),
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, message: 'Plan not found or inactive', code: 'PLAN_NOT_FOUND' },
        { status: 400 }
      );
    }

    // 2. Fetch default store
    const store = await db.query.stores.findFirst();
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'No active store found', code: 'STORE_NOT_FOUND' },
        { status: 500 }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Set end date to 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    const endStr = nextYear.toISOString().split('T')[0];

    // 3. Create Subscription in Transaction
    const result = await db.transaction(async (tx) => {
      const [newSub] = await tx.insert(subscriptions).values({
        userId: user.id,
        planId: plan.id,
        storeId: store.id,
        status: 'active',
        startDate: todayStr,
        endDate: endStr,
        billingFrequency: 'weekly',
        price: plan.price,
        deliveryDays: [validated.deliveryWeekday],
        deliveryTimeSlotId: validated.deliveryTimeSlotId,
        shippingAddressId: validated.shippingAddressId,
        paymentMethod: validated.paymentMethod,
      }).returning();

      // 4. Pre-schedule the first weekly selection
      // Calculate date of next occurrence of deliveryWeekday
      const nextDelivery = new Date(today);
      const currentDay = today.getDay();
      const targetDay = validated.deliveryWeekday;
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // deliver next week if weekday passed or is today
      nextDelivery.setDate(today.getDate() + daysToAdd);
      const nextDeliveryStr = nextDelivery.toISOString().split('T')[0];

      // Insert default selection
      await tx.insert(subscriptionSelections).values({
        subscriptionId: newSub.id,
        deliveryDate: nextDeliveryStr,
        selections: {
          garnish: [],
          seasonal: [],
          regular: [],
          leafy: []
        },
        status: 'pending',
      });

      return newSub;
    });

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully',
      data: result
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Subscribe API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
