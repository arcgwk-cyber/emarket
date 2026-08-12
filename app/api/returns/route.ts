import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, returns, returnItems, orderItems, orderStatusHistory } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const returnRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1, 'Reason for return is required'),
  description: z.string().optional(),
  items: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
    })
  ).min(1, 'At least one item must be returned'),
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
    const validated = returnRequestSchema.parse(body);

    // 1. Fetch order details
    const orderRecord = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, validated.orderId),
        eq(orders.userId, user.id)
      ),
    });

    if (!orderRecord) {
      return NextResponse.json(
        { success: false, message: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Return checks: Order must be DELIVERED to request a return
    if (orderRecord.status !== 'delivered') {
      return NextResponse.json(
        { success: false, message: 'Only delivered orders can be returned', code: 'INVALID_ORDER_STATE' },
        { status: 400 }
      );
    }

    // 2. Generate unique return parameters
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(returns);
    const sequence = (countRes[0]?.count || 0) + 1;
    const paddedSeq = sequence.toString().padStart(6, '0');
    const returnNumber = `RET-${dateStr}-${paddedSeq}`;

    // 3. Database transaction to register return and log status
    const result = await db.transaction(async (tx) => {
      // Create return record
      const [newReturn] = await tx
        .insert(returns)
        .values({
          orderId: orderRecord.id,
          returnNumber,
          status: 'requested',
          reason: validated.reason,
          description: validated.description || null,
        })
        .returning();

      // Insert return items
      for (const item of validated.items) {
        // Verify item exists in order
        const orderItemRecord = await tx.query.orderItems.findFirst({
          where: and(
            eq(orderItems.id, item.orderItemId),
            eq(orderItems.orderId, orderRecord.id)
          ),
        });

        if (!orderItemRecord) {
          throw new Error('ITEM_NOT_FOUND');
        }

        if (item.quantity > orderItemRecord.quantity) {
          throw new Error('QUANTITY_EXCEEDED');
        }

        await tx.insert(returnItems).values({
          returnId: newReturn.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          status: 'pending',
        });
      }

      // Update Order status
      await tx
        .update(orders)
        .set({
          status: 'return_requested',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderRecord.id));

      // Record logs history entry
      await tx.insert(orderStatusHistory).values({
        orderId: orderRecord.id,
        status: 'return_requested',
        notes: `Customer requested a return. Return ID: ${returnNumber}. Reason: ${validated.reason}`,
      });

      return newReturn;
    });

    return NextResponse.json({
      success: true,
      message: 'Return request submitted successfully',
      data: result,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    if (error.message === 'ITEM_NOT_FOUND') {
      return NextResponse.json(
        { success: false, message: 'One or more items do not belong to this order', code: 'INVALID_ITEM' },
        { status: 400 }
      );
    }

    if (error.message === 'QUANTITY_EXCEEDED') {
      return NextResponse.json(
        { success: false, message: 'Return quantity exceeds purchased quantity', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    console.error('Customer return request API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during return request', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
