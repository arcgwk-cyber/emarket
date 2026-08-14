import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  subscriptions, 
  subscriptionItems, 
  subscriptionDeliveries, 
  subscriptionSelections,
  orders, 
  orderItems, 
  orderStatusHistory, 
  products, 
  productVariants 
} from '@/lib/db/schema';
import { eq, and, sql, gte, lte, desc, isNull } from 'drizzle-orm';
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
        plan: true,
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
        const itemsToInsert: any[] = [];
        let subtotal = 0;
        let taxAmount = 0;
        let totalAmount = 0;

        if (sub.planId) {
          // A. Customizable vegetable basket subscription
          // 1. Fetch custom selections for today, or roll over from latest selection
          let selectionRecord = await tx.query.subscriptionSelections.findFirst({
            where: and(
              eq(subscriptionSelections.subscriptionId, sub.id),
              eq(subscriptionSelections.deliveryDate, todayStr)
            )
          });

          if (!selectionRecord) {
            // Roll over: find the most recent previous selection record
            selectionRecord = await tx.query.subscriptionSelections.findFirst({
              where: eq(subscriptionSelections.subscriptionId, sub.id),
              orderBy: desc(subscriptionSelections.deliveryDate)
            });
          }

          // 2. Fetch all products tagged as 'fixed' (Fixed Essentials)
          const fixedProducts = await tx.query.products.findMany({
            where: and(
              eq(products.subscriptionCategory, 'fixed'),
              eq(products.status, 'active')
            )
          });

          // 3. Extract selections IDs
          const garnishIds: string[] = [];
          const seasonalIds: string[] = [];
          const regularIds: string[] = []; // cooking
          const leafyIds: string[] = [];

          if (selectionRecord) {
            const dbSel = (selectionRecord.selections as any) || {};
            if (Array.isArray(dbSel.garnish)) garnishIds.push(...dbSel.garnish);
            if (Array.isArray(dbSel.seasonal)) seasonalIds.push(...dbSel.seasonal);
            if (Array.isArray(dbSel.regular)) regularIds.push(...dbSel.regular);
            if (Array.isArray(dbSel.leafy)) leafyIds.push(...dbSel.leafy);
          }

          // 4. Fallback defaults if selectionRecord was empty or user didn't make choices
          const planName = sub.plan?.name ?? '';
          let limits = { maxGarnish: 1, maxSeasonal: 3, maxCooking: 2, maxLeafy: 2 };
          if (planName.includes('Medium')) {
            limits = { maxGarnish: 2, maxSeasonal: 4, maxCooking: 3, maxLeafy: 3 };
          } else if (planName.includes('Moderate')) {
            limits = { maxGarnish: 3, maxSeasonal: 5, maxCooking: 4, maxLeafy: 4 };
          }

          const allActiveProducts = await tx.query.products.findMany({
            where: and(eq(products.status, 'active'), isNull(products.deletedAt)),
          });

          if (garnishIds.length < limits.maxGarnish) {
            const defaults = allActiveProducts.filter(p => p.subscriptionCategory === 'garnish').slice(0, limits.maxGarnish - garnishIds.length);
            garnishIds.push(...defaults.map(d => d.id));
          }
          if (seasonalIds.length < limits.maxSeasonal) {
            const defaults = allActiveProducts.filter(p => p.subscriptionCategory === 'seasonal').slice(0, limits.maxSeasonal - seasonalIds.length);
            seasonalIds.push(...defaults.map(d => d.id));
          }
          if (regularIds.length < limits.maxCooking) {
            const defaults = allActiveProducts.filter(p => p.subscriptionCategory === 'cooking').slice(0, limits.maxCooking - regularIds.length);
            regularIds.push(...defaults.map(d => d.id));
          }
          if (leafyIds.length < limits.maxLeafy) {
            const defaults = allActiveProducts.filter(p => p.subscriptionCategory === 'leafy').slice(0, limits.maxLeafy - leafyIds.length);
            leafyIds.push(...defaults.map(d => d.id));
          }

          // 5. Gather all product records
          const allProductIds = [...garnishIds, ...seasonalIds, ...regularIds, ...leafyIds];
          let selectedProducts: any[] = [];
          if (allProductIds.length > 0) {
            selectedProducts = allActiveProducts.filter(p => allProductIds.includes(p.id));
          }

          // 6. Add Fixed Essentials to items list
          for (const item of fixedProducts) {
            itemsToInsert.push({
              productId: item.id,
              variantId: null,
              quantity: 1,
              price: '0.00',
              taxPercent: '0.00',
              taxAmount: '0.00',
              discountAmount: '0.00',
              finalPrice: '0.00',
            });
          }

          // 7. Add Choices to items list (billed as 0 since order total matches plan price)
          for (const item of selectedProducts) {
            itemsToInsert.push({
              productId: item.id,
              variantId: null,
              quantity: 1,
              price: '0.00',
              taxPercent: '0.00',
              taxAmount: '0.00',
              discountAmount: '0.00',
              finalPrice: '0.00',
            });
          }

          subtotal = parseFloat(sub.price);
          taxAmount = 0;
          totalAmount = subtotal;

        } else {
          // B. Fallback to existing logic for standard subscription items
          const subItemsDetails = await tx.query.subscriptionItems.findMany({
            where: eq(subscriptionItems.subscriptionId, sub.id),
            with: {
              product: true,
              variant: true,
            },
          });

          if (subItemsDetails.length === 0) return;

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
          totalAmount = subtotal + taxAmount;
        }

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
