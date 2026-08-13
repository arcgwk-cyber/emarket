import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const allowedStatuses = ['active', 'paused', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // 1. Verify ownership
    const existingSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, user.id)
      ),
    });

    if (!existingSub) {
      return NextResponse.json(
        { success: false, message: 'Subscription not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Update status
    await db.update(subscriptions)
      .set({ 
        status: status,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, id));

    return NextResponse.json({
      success: true,
      message: `Subscription ${status} successfully`,
    });

  } catch (error) {
    console.error('Update subscription status API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
