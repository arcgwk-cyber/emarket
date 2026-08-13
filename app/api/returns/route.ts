import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { returns, returnItems, orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

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
    const { orderId, reason, description, items } = body;

    if (!orderId || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required return request fields' },
        { status: 400 }
      );
    }

    // 1. Verify order exists and belongs to customer
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.userId, user.id)
      ),
      with: {
        items: true,
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    // 2. Generate unique return number: RET-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const returnNumber = `RET-${dateStr}-${rand}`;

    // 3. Save return request within a transaction
    const newReturn = await db.transaction(async (tx) => {
      const [ret] = await tx.insert(returns).values({
        orderId,
        returnNumber,
        status: 'requested',
        reason,
        description: description || null,
        images: [],
      }).returning();

      // Insert return items
      for (const item of items) {
        // Verify order item exists in the order
        const matched = order.items.find(oi => oi.id === item.orderItemId);
        if (!matched) continue;

        await tx.insert(returnItems).values({
          returnId: ret.id,
          orderItemId: item.orderItemId,
          quantity: Math.min(item.quantity, matched.quantity),
          status: 'pending',
        });
      }

      // Update parent order status to return_requested
      await tx.update(orders)
        .set({ 
          status: 'return_requested',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      return ret;
    });

    return NextResponse.json({
      success: true,
      message: 'Return request submitted successfully',
      data: newReturn,
    });

  } catch (error: any) {
    console.error('Submit return request API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
