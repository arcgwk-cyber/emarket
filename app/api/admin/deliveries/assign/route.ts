import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, deliveries, drivers, orderStatusHistory } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';
import { sendWhatsAppNotification } from '@/lib/services/notifications';
import { z } from 'zod';

const assignSchema = z.object({
  orderId: z.string().uuid(),
  driverId: z.string().uuid(),
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

    // 1. Role permission validation
    const canAssign = await hasPermission(user.id, 'manage_orders');
    if (!canAssign) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Staff access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = assignSchema.parse(body);

    // 2. Verify driver exists and is active
    const driverRecord = await db.query.drivers.findFirst({
      where: eq(drivers.id, validated.driverId),
    });

    if (!driverRecord || driverRecord.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Selected driver is invalid or offline', code: 'INVALID_DRIVER' },
        { status: 400 }
      );
    }

    // 3. Verify order exists and is ready
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, validated.orderId),
    });

    if (!orderRecord) {
      return NextResponse.json(
        { success: false, message: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (orderRecord.status === 'cancelled' || orderRecord.status === 'delivered') {
      return NextResponse.json(
        { success: false, message: 'Order cannot be assigned in its current state', code: 'INVALID_STATE' },
        { status: 400 }
      );
    }

    // 4. Generate unique delivery parameters
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(deliveries);
    const sequence = (countRes[0]?.count || 0) + 1;
    const paddedSeq = sequence.toString().padStart(6, '0');
    const deliveryNumber = `DEL-${dateStr}-${paddedSeq}`;

    // 5. Wrap in database transaction
    await db.transaction(async (tx) => {
      // Create assignment record
      await tx.insert(deliveries).values({
        orderId: orderRecord.id,
        deliveryNumber,
        driverId: driverRecord.id,
        status: 'assigned',
        otpConfirmationCode: generatedOtp,
      });

      // Update Order Status
      await tx
        .update(orders)
        .set({
          status: 'ready_for_dispatch',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderRecord.id));

      // Update Driver status to on_delivery
      await tx
        .update(drivers)
        .set({ status: 'on_delivery', updatedAt: new Date() })
        .where(eq(drivers.id, driverRecord.id));

      // Record logs entry
      await tx.insert(orderStatusHistory).values({
        orderId: orderRecord.id,
        status: 'ready_for_dispatch',
        notes: `Delivery agent assigned. OTP code generated and dispatched to customer.`,
      });
    });

    // 6. Trigger simulated notification
    if (orderRecord.recipientMobile) {
      await sendWhatsAppNotification(
        orderRecord.userId,
        orderRecord.recipientMobile,
        'order_out_for_delivery',
        {
          orderNumber: orderRecord.orderNumber,
          deliveryOtp: generatedOtp,
          recipientName: orderRecord.recipientName,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery agent assigned successfully',
      data: { deliveryNumber, deliveryOtp: generatedOtp },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Assign delivery API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
