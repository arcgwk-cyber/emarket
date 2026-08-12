import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  subscriptions, 
  subscriptionItems, 
  subscriptionDeliveries, 
  orders, 
  orderItems, 
  orderStatusHistory, 
  products, 
  productVariants 
} from '@/lib/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { sendWhatsAppNotification } from '@/lib/services/notifications';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cronSecret = bearerSecret || searchParams.get('secret') || '';

    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, message: 'CRON secret is not configured.', code: 'CRON_NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    const expectedBuffer = Buffer.from(expectedSecret);
    const receivedBuffer = Buffer.from(cronSecret);
    const isAuthorized =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Invalid secret key.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    console.log('🔄 Executing Subscriptions order generation CRON job...');

    // 1. Get current date parameters
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // 2. Query active subscriptions overlapping today's date
    const activeSubscriptions = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.startDate} <= ${todayStr}`,
        sql`${subscriptions.endDate} >= ${todayStr}`
      ),
      with: {
        items: true,
      },
    });

    let generatedCount = 0;

    for (const sub of activeSubscriptions) {
      // 3. Check if delivery is scheduled for current day of week
      if (!sub.deliveryDays.includes(dayOfWeek)) {
        continue;
      }

      // 4. Idempotency Check: Verify if an order was already generated for this subscription today
      const alreadyScheduled = await db.query.subscriptionDeliveries.findFirst({
        where: and(
          eq(subscriptionDeliveries.subscriptionId, sub.id),
          eq(subscriptionDeliveries.deliveryDate, todayStr)
        ),
      });

      if (alreadyScheduled) {
        continue;
      }

      // 5. Generate Order in transaction
      await db.transaction(async (tx) => {
        // Fetch full subscription items details (price, details)
        const subItemsDetails = await tx.query.subscriptionItems.findMany({
          where: eq(subscriptionItems.subscriptionId, sub.id),
          with: {
            product: true,
            variant: true,
          },
        });

        if (subItemsDetails.length === 0) return;

        // Calculate totals
        let subtotal = 0;
        let taxAmount = 0;
        const itemsToInsert: any[] = [];

        for (const item of subItemsDetails) {
          const price = item.variant ? parseFloat(item.variant.sellingPrice) : parseFloat(item.product.sellingPrice);
          const itemSubtotal = price * item.quantity;
          const gstPercent = parseFloat(item.product.gstPercent);
          const itemTax = itemSubtotal * (gstPercent / 100);

          subtotal += itemSubtotal;
          taxAmount += itemTax;

          itemsToInsert.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: price.toFixed(2),
            taxPercent: gstPercent.toFixed(2),
            taxAmount: itemTax.toFixed(2),
            discountAmount: '0.00',
            finalPrice: itemSubtotal.toFixed(2),
          });
        }

        const totalAmount = subtotal + taxAmount; // Subscriptions usually have free delivery configured in prepaid plans

        // Generate numbers
        const dateCompact = todayStr.replace(/-/g, '');
        const countOrders = await tx
          .select({ count: sql<number>`count(*)` })
          .from(orders);
        const sequence = (countOrders[0]?.count || 0) + 1;
        const paddedSeq = sequence.toString().padStart(6, '0');
        const orderNumber = `ORD-${dateCompact}-SUB-${paddedSeq}`;
        const invoiceNumber = `INV-${dateCompact}-SUB-${paddedSeq}`;

        // Insert Order as PREPAID/CONFIRMED
        const [newOrder] = await tx
          .insert(orders)
          .values({
            storeId: sub.storeId,
            userId: sub.userId,
            orderNumber,
            invoiceNumber,
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: sub.paymentMethod,
            shippingAddressId: sub.shippingAddressId,
            deliverySlotId: sub.deliveryTimeSlotId,
            deliveryDate: todayStr,
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            deliveryCharge: '0.00',
            packagingFee: '0.00',
            convenienceFee: '0.00',
            discountAmount: '0.00',
            totalAmount: totalAmount.toFixed(2),
          })
          .returning();

        // Insert Order Items
        for (const orderItem of itemsToInsert) {
          await tx.insert(orderItems).values({
            orderId: newOrder.id,
            ...orderItem,
          });
        }

        // Write order status history notes log
        await tx.insert(orderStatusHistory).values({
          orderId: newOrder.id,
          status: 'confirmed',
          notes: `Prepaid order generated automatically by Subscription CRON scheduler. Subscription ID: ${sub.id}`,
        });

        // Register subscription delivery scheduling to enforce idempotency
        await tx.insert(subscriptionDeliveries).values({
          subscriptionId: sub.id,
          orderId: newOrder.id,
          deliveryDate: todayStr,
          status: 'scheduled',
        });

        generatedCount++;
        console.log(`✅ Generated subscription order: ${orderNumber} for user ${sub.userId}`);
      });
    }

    console.log(`✨ Subscriptions CRON finished. Generated ${generatedCount} subscription orders.`);

    return NextResponse.json({
      success: true,
      message: `CRON job finished successfully. Generated ${generatedCount} orders.`,
    });

  } catch (error) {
    console.error('Subscription CRON job API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during CRON execution', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
