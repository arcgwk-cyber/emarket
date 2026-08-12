import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, deliveries, drivers, orderStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';
import { sendWhatsAppNotification } from '@/lib/services/notifications';
import { z } from 'zod';

const verifyOtpSchema = z.object({
  deliveryId: z.string().uuid(),
  otp: z.string().length(4, 'OTP must be exactly 4 digits'),
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

    // Role check: Only driver or manager can verify OTP
    const isStaff = await hasPermission(user.id, 'manage_orders');
    if (!isStaff) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Access restricted.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = verifyOtpSchema.parse(body);

    // 1. Fetch active delivery assignment
    const delRecord = await db.query.deliveries.findFirst({
      where: eq(deliveries.id, validated.deliveryId),
    });

    if (!delRecord || delRecord.status !== 'assigned') {
      return NextResponse.json(
        { success: false, message: 'Active delivery assignment not found', code: 'DELIVERY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Validate OTP code
    if (delRecord.otpConfirmationCode !== validated.otp) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP code. Please verify and try again.', code: 'INVALID_OTP' },
        { status: 400 }
      );
    }

    // 3. OTP matches -> Complete delivery in database transaction
    await db.transaction(async (tx) => {
      
      // Update delivery assignment
      await tx
        .update(deliveries)
        .set({
          status: 'delivered',
          deliveryTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, delRecord.id));

      // Fetch order
      const orderRecord = await tx.query.orders.findFirst({
        where: eq(orders.id, delRecord.orderId || ''),
      });

      if (orderRecord) {
        const orderPayload: Record<string, any> = {
          status: 'delivered',
          updatedAt: new Date(),
        };

        // If Cash on Delivery, mark as paid upon OTP verification confirmation
        if (orderRecord.paymentMethod === 'cod') {
          orderPayload.paymentStatus = 'paid';
        }

        // Update Order
        await tx
          .update(orders)
          .set(orderPayload)
          .where(eq(orders.id, orderRecord.id));

        // Write order history log
        await tx.insert(orderStatusHistory).values({
          orderId: orderRecord.id,
          status: 'delivered',
          notes: `Delivery verified successfully via OTP at doorstep. Order status marked DELIVERED.`,
        });

        // Free the driver status back to active
        if (delRecord.driverId) {
          await tx
            .update(drivers)
            .set({ status: 'active', updatedAt: new Date() })
            .where(eq(drivers.id, delRecord.driverId));
        }

        // Send delivery notification
        if (orderRecord.recipientMobile) {
          await sendWhatsAppNotification(
            orderRecord.userId,
            orderRecord.recipientMobile,
            'order_delivered',
            {
              orderNumber: orderRecord.orderNumber,
              recipientName: orderRecord.recipientName,
            }
          );
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed successfully via OTP verification',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Verify OTP API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during verification', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
