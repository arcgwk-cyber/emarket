import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  orders, 
  returns, 
  returnItems, 
  payments, 
  refunds, 
  orderItems, 
  orderStatusHistory 
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';
import { z } from 'zod';

const statusSchema = z.object({
  returnId: z.string().uuid(),
  status: z.enum([
    'requested',
    'under_review',
    'approved',
    'rejected',
    'pickup_scheduled',
    'picked_up',
    'received',
    'inspected',
    'completed',
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

    // Role check: Only staff can modify return status
    const isStaff = await hasPermission(user.id, 'manage_orders');
    if (!isStaff) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Staff access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = statusSchema.parse(body);

    // 1. Fetch return record
    const returnRecord = await db.query.returns.findFirst({
      where: eq(returns.id, validated.returnId),
    });

    if (!returnRecord) {
      return NextResponse.json(
        { success: false, message: 'Return record not found', code: 'RETURN_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Wrap state transitions and financial refund logs in transaction
    await db.transaction(async (tx) => {
      // Update Return status
      await tx
        .update(returns)
        .set({
          status: validated.status,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, returnRecord.id));

      // Fetch order
      const orderRecord = await tx.query.orders.findFirst({
        where: eq(orders.id, returnRecord.orderId || ''),
      });

      if (orderRecord) {
        // Log history advancement
        await tx.insert(orderStatusHistory).values({
          orderId: orderRecord.id,
          status: `return_${validated.status}`,
          notes: validated.notes || `Return request advanced to ${validated.status.toUpperCase()}`,
        });

        // IF return is marked completed/inspected, trigger financial refund logging
        if (validated.status === 'completed') {
          // Calculate refund amount based on approved return items
          const itemsReturned = await tx.query.returnItems.findMany({
            where: eq(returnItems.returnId, returnRecord.id),
          });

          let refundSum = 0;

          for (const item of itemsReturned) {
            // Find order item selling price
            const orderItemRecord = await tx.query.orderItems.findFirst({
              where: eq(orderItems.id, item.orderItemId),
            });

            if (orderItemRecord && item.status !== 'rejected') {
              const price = parseFloat(orderItemRecord.price);
              refundSum += price * item.quantity;
            }
          }

          // Fetch original successful payment
          const paymentRecord = await tx.query.payments.findFirst({
            where: and(
              eq(payments.orderId, orderRecord.id),
              eq(payments.status, 'captured')
            ),
          });

          if (paymentRecord && refundSum > 0) {
            // Generate unique refund reference ID
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countRes = await tx
              .select({ count: sql<number>`count(*)` })
              .from(refunds);
            const sequence = (countRes[0]?.count || 0) + 1;
            const paddedSeq = sequence.toString().padStart(6, '0');
            const refundNumber = `REF-${dateStr}-${paddedSeq}`;

            // Create Financial Refund Log entry
            await tx.insert(refunds).values({
              orderId: orderRecord.id,
              paymentId: paymentRecord.id,
              returnId: returnRecord.id,
              refundNumber,
              amount: refundSum.toFixed(2),
              status: 'completed', // auto marked completed in logs representation
              reason: `Refund processed for return ID: ${returnRecord.returnNumber}`,
            });

            // Write order history log
            await tx.insert(orderStatusHistory).values({
              orderId: orderRecord.id,
              status: 'refunded',
              notes: `Refund processed successfully. Payout: ₹${refundSum.toFixed(2)}. Reference ID: ${refundNumber}`,
            });
          }

          // Update Order status
          await tx
            .update(orders)
            .set({
              status: 'returned',
              paymentStatus: 'refunded',
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderRecord.id));
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Return status updated to ${validated.status.toUpperCase()}`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Update return status API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
