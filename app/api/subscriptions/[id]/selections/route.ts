import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions, subscriptionSelections } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const selectionsSchema = z.object({
  deliveryDate: z.string(),
  selections: z.object({
    garnish: z.array(z.string().uuid()),
    seasonal: z.array(z.string().uuid()),
    cooking: z.array(z.string().uuid()),
    leafy: z.array(z.string().uuid()),
  }),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id: subscriptionId } = await params;
    const body = await request.json();
    const validated = selectionsSchema.parse(body);

    // 1. Verify subscription ownership
    const sub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, user.id)
      ),
    });

    if (!sub) {
      return NextResponse.json(
        { success: false, message: 'Subscription not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Find or Update selection record
    let record = await db.query.subscriptionSelections.findFirst({
      where: and(
        eq(subscriptionSelections.subscriptionId, subscriptionId),
        eq(subscriptionSelections.deliveryDate, validated.deliveryDate)
      ),
    });

    // Map `cooking` key in selections payload to database `regular` key
    const dbSelections = {
      garnish: validated.selections.garnish,
      seasonal: validated.selections.seasonal,
      regular: validated.selections.cooking, // database column field mapping
      leafy: validated.selections.leafy,
    };

    if (record) {
      await db.update(subscriptionSelections)
        .set({
          selections: dbSelections,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionSelections.id, record.id));
    } else {
      await db.insert(subscriptionSelections).values({
        subscriptionId,
        deliveryDate: validated.deliveryDate,
        selections: dbSelections,
        status: 'pending',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly selections updated successfully',
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Save weekly selections API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
