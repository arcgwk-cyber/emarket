import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments, orderStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyRazorpaySignature } from '@/lib/services/razorpay';
import { commitReservedInventory, releaseReservedInventory } from '@/lib/services/inventory';
import { getCurrentUser } from '@/lib/services/auth';
import { z } from 'zod';

const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
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
    const validated = verifySchema.parse(body);

    // 1. Fetch order details
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, validated.orderId),
    });

    if (!orderRecord) {
      return NextResponse.json(
        { success: false, message: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (orderRecord.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (orderRecord.paymentStatus !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Order is not awaiting payment', code: 'INVALID_PAYMENT_STATE' },
        { status: 400 }
      );
    }

    // 2. Perform signature check
    const isValid = verifyRazorpaySignature(
      validated.razorpayOrderId,
      validated.razorpayPaymentId,
      validated.razorpaySignature
    );

    if (!isValid) {
      // Payment validation failed
      await db.transaction(async (tx) => {
        // Update order status to failed
        await tx
          .update(orders)
          .set({
            status: 'cancelled',
            paymentStatus: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderRecord.id));

        // Add history log
        await tx.insert(orderStatusHistory).values({
          orderId: orderRecord.id,
          status: 'cancelled',
          notes: 'Order cancelled due to Razorpay payment signature verification failure.',
        });

        // Release reserved inventory back to available stock
        await releaseReservedInventory(orderRecord.id, tx);
      });

      return NextResponse.json(
        { success: false, message: 'Payment verification failed', code: 'PAYMENT_FAILED' },
        { status: 400 }
      );
    }

    // 3. Signature is valid -> Mark Payment as Paid (Keep Order as PENDING until approved by admin/store manager)
    await db.transaction(async (tx) => {
      // Update order
      await tx
        .update(orders)
        .set({
          status: 'pending',
          paymentStatus: 'paid',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderRecord.id));

      // Record payment log entry
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const paymentNumber = `PAY-${dateStr}-${validated.razorpayPaymentId.slice(-8).toUpperCase()}`;

      await tx.insert(payments).values({
        orderId: orderRecord.id,
        paymentNumber,
        amount: orderRecord.totalAmount,
        status: 'captured',
        gateway: 'razorpay',
        gatewayTransactionId: validated.razorpayPaymentId,
        paymentMethod: orderRecord.paymentMethod,
        rawPayload: {
          razorpayOrderId: validated.razorpayOrderId,
          razorpaySignature: validated.razorpaySignature,
        },
      });

      // Write status history log
      await tx.insert(orderStatusHistory).values({
        orderId: orderRecord.id,
        status: 'pending',
        notes: `Payment verification successful. Razorpay ID: ${validated.razorpayPaymentId}. Awaiting Admin confirmation.`,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Payment verification API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during verification', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
