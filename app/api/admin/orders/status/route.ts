import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';
import { releaseReservedInventory } from '@/lib/services/inventory';
import { z } from 'zod';

const statusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready_for_dispatch',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
  ]),
  notes: z.string().optional(),
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

    // Role Permission check: Only staff (Admin, Kitchen Manager, Driver) can modify order status
    const canUpdate = await hasPermission(user.id, 'manage_orders');
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Staff access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = statusUpdateSchema.parse(body);

    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, validated.orderId),
    });

    if (!orderRecord) {
      return NextResponse.json(
        { success: false, message: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Wrap state updates and history writing in transaction
    await db.transaction(async (tx) => {
      
      const payload: Record<string, any> = {
        status: validated.status,
        updatedAt: new Date(),
      };

      // Set payment status based on delivery updates
      if (validated.status === 'delivered' && orderRecord.paymentMethod === 'cod') {
        payload.paymentStatus = 'paid';
      }

      // If cancelling, handle inventory releases and potential refunds
      if (validated.status === 'cancelled') {
        payload.paymentStatus = orderRecord.paymentStatus === 'paid' ? 'refunded' : 'failed';
        
        // Release reserved inventory back to available stock
        await releaseReservedInventory(orderRecord.id, tx);
      }

      // Update Order
      await tx
        .update(orders)
        .set(payload)
        .where(eq(orders.id, orderRecord.id));

      // Insert log history entry
      await tx.insert(orderStatusHistory).values({
        orderId: orderRecord.id,
        status: validated.status,
        notes: validated.notes || `Order status advanced to ${validated.status.toUpperCase()}`,
      });
    });

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${validated.status.toUpperCase()}`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Update status API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
