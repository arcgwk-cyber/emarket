import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  carts, 
  cartItems, 
  orders, 
  orderItems, 
  orderStatusHistory, 
  customerAddresses, 
  deliverySlots, 
  inventory, 
  inventoryTransactions,
  coupons,
  couponUsages,
  stores
} from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';

const checkoutSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  deliverySlotId: z.string().uuid('Invalid delivery slot ID'),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  couponCode: z.string().optional().nullable(),
  isGift: z.boolean().default(false),
  recipientName: z.string().optional().nullable(),
  recipientMobile: z.string().optional().nullable(),
  giftMessage: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  paymentMethod: z.enum(['cod', 'upi', 'card', 'netbanking', 'wallet']),
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
    const validated = checkoutSchema.parse(body);

    if (validated.paymentMethod !== 'cod') {
      return NextResponse.json(
        {
          success: false,
          message: 'Online payments are not enabled for this deployment yet. Please choose Cash on Delivery.',
          code: 'PAYMENT_METHOD_DISABLED',
        },
        { status: 400 }
      );
    }

    // 1. Fetch user's cart
    const userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (!userCart) {
      return NextResponse.json(
        { success: false, message: 'Your cart is empty', code: 'EMPTY_CART' },
        { status: 400 }
      );
    }

    const dbItems = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, userCart.id),
      with: {
        product: true,
        variant: true,
      },
    });

    const items = dbItems.filter((item: any) => item.product !== null);

    // Auto-clean database for any deleted product references
    const orphanedIds = dbItems.filter((item: any) => item.product === null).map((item: any) => item.id);
    if (orphanedIds.length > 0) {
      await db.delete(cartItems).where(inArray(cartItems.id, orphanedIds));
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Your cart is empty', code: 'EMPTY_CART' },
        { status: 400 }
      );
    }

    // 2. Fetch shipping address
    const address = await db.query.customerAddresses.findFirst({
      where: and(
        eq(customerAddresses.id, validated.addressId),
        eq(customerAddresses.userId, user.id)
      ),
    });

    if (!address) {
      return NextResponse.json(
        { success: false, message: 'Shipping address not found', code: 'ADDRESS_NOT_FOUND' },
        { status: 400 }
      );
    }

    // 3. Fetch delivery slot
    const slot = await db.query.deliverySlots.findFirst({
      where: eq(deliverySlots.id, validated.deliverySlotId),
    });

    if (!slot || !slot.isActive) {
      return NextResponse.json(
        { success: false, message: 'Selected delivery slot is inactive or invalid', code: 'INVALID_SLOT' },
        { status: 400 }
      );
    }

    // Check delivery slots cap booking counts
    const existingOrdersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.deliverySlotId, slot.id),
          eq(orders.deliveryDate, validated.deliveryDate)
        )
      );

    const bookedOrders = existingOrdersCount[0]?.count || 0;
    if (bookedOrders >= slot.maxOrders) {
      return NextResponse.json(
        { success: false, message: 'This delivery slot has reached booking limits. Please select another slot.', code: 'SLOT_FULL' },
        { status: 400 }
      );
    }

    // 4. Calculate Subtotals & Item Taxes
    let subtotal = 0;
    let taxAmount = 0;
    const orderItemsToInsert: any[] = [];

    for (const itemNode of items) {
      const item = itemNode as any;
      const price = item.variant ? parseFloat(item.variant.sellingPrice) : parseFloat(item.product.sellingPrice);
      const mrp = item.variant ? parseFloat(item.variant.mrp) : parseFloat(item.product.mrp);
      
      const itemSubtotal = price * item.quantity;
      const gstPercent = parseFloat(item.product.gstPercent);
      const itemTax = itemSubtotal - (itemSubtotal / (1 + gstPercent / 100));

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      orderItemsToInsert.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: price.toFixed(2),
        taxPercent: gstPercent.toFixed(2),
        taxAmount: itemTax.toFixed(2),
        discountAmount: (mrp - price > 0 ? (mrp - price) * item.quantity : 0).toFixed(2),
        finalPrice: itemSubtotal.toFixed(2),
      });
    }

    // 5. Coupon validation
    let discountAmount = 0;
    let couponId: string | null = null;

    if (validated.couponCode) {
      const coupon = await db.query.coupons.findFirst({
        where: and(
          eq(coupons.code, validated.couponCode),
          eq(coupons.isActive, true)
        ),
      });

      if (!coupon) {
        return NextResponse.json(
          { success: false, message: 'Coupon code is invalid or expired', code: 'INVALID_COUPON' },
          { status: 400 }
        );
      }

      // Check min order limit
      if (subtotal < parseFloat(coupon.minOrderAmount)) {
        return NextResponse.json(
          { success: false, message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`, code: 'COUPON_LIMIT' },
          { status: 400 }
        );
      }

      // Calculate discount
      if (coupon.discountType === 'fixed_amount') {
        discountAmount = parseFloat(coupon.discountValue);
      } else if (coupon.discountType === 'percentage') {
        discountAmount = subtotal * (parseFloat(coupon.discountValue) / 100);
      }

      // Apply max discount cap
      if (coupon.maxDiscountAmount && discountAmount > parseFloat(coupon.maxDiscountAmount)) {
        discountAmount = parseFloat(coupon.maxDiscountAmount);
      }

      couponId = coupon.id;
    }

    // Fees config
    const deliveryCharge = subtotal > 499 ? 0 : parseFloat(slot.deliveryCharge);
    const packagingFee = subtotal > 0 ? 15 : 0; // standard packaging flat fee
    const convenienceFee = 5; // standard tech fee
    const totalAmount = subtotal + deliveryCharge + packagingFee + convenienceFee - discountAmount;

    // 6. DB TRANSACTION FOR INVENTORY & ORDER CREATION
    const orderResult = await db.transaction(async (tx) => {
      // Find active store to link order and perform stock checks
      const activeStore = await tx.query.stores.findFirst({
        where: eq(stores.status, 'active'),
      });
      if (!activeStore) {
        throw new Error('No active store found to process this order.');
      }
      const orderStoreId = activeStore.id;
      
      // A. Query and Lock inventory rows for UPDATE (prevent overselling)
      for (const itemNode of items) {
        const item = itemNode as any;

        // Raw SELECT FOR UPDATE to lock inventory row for the correct store
        const lockQuery = await tx.execute(sql`
          SELECT id, physical_stock, reserved_stock 
          FROM inventory 
          WHERE store_id = ${orderStoreId}
            AND product_id = ${item.productId} 
            AND (variant_id = ${item.variantId || null} OR variant_id IS NULL)
          FOR UPDATE
        `);

        if (lockQuery.rows.length > 0) {
          const invRow = lockQuery.rows[0] as any;
          const physical = invRow.physical_stock;
          const reserved = invRow.reserved_stock;
          const available = physical - reserved;

          if (available < item.quantity) {
            throw new Error(`OUT_OF_STOCK:${item.product.name}:${item.id}`);
          }

          // Update reserved stock
          await tx
            .update(inventory)
            .set({ 
              reservedStock: reserved + item.quantity,
              updatedAt: new Date()
            })
            .where(eq(inventory.id, invRow.id));
        }
      }

      // B. Generate human-readable numbers
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      const countRes = await tx
        .select({ count: sql<number>`count(*)` })
        .from(orders);
      
      const sequence = (countRes[0]?.count || 0) + 1;
      const paddedSeq = sequence.toString().padStart(6, '0');
      
      const orderNumber = `ORD-${dateStr}-${paddedSeq}`;
      const invoiceNumber = `INV-${dateStr}-${paddedSeq}`;

      // C. Insert Order (All new orders are placed as PENDING until approved by admin/store manager)
      const initialStatus = 'pending';
      const initialPayStatus = 'pending';

      const [newOrder] = await tx
        .insert(orders)
        .values({
          storeId: orderStoreId,
          userId: user.id,
          orderNumber,
          invoiceNumber,
          status: initialStatus,
          paymentStatus: initialPayStatus,
          paymentMethod: validated.paymentMethod,
          shippingAddressId: address.id,
          deliverySlotId: slot.id,
          deliveryDate: validated.deliveryDate,
          isGift: validated.isGift,
          recipientName: validated.isGift ? validated.recipientName : address.recipientName,
          recipientMobile: validated.isGift ? validated.recipientMobile : address.recipientMobile,
          giftMessage: validated.isGift ? validated.giftMessage : null,
          deliveryInstructions: validated.deliveryInstructions || address.deliveryInstructions,
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          deliveryCharge: deliveryCharge.toFixed(2),
          packagingFee: packagingFee.toFixed(2),
          convenienceFee: convenienceFee.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          couponCode: validated.couponCode || null,
        })
        .returning();

      // D. Insert Order Items
      for (const orderItem of orderItemsToInsert) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          ...orderItem,
        });
      }

      // E. Write Status History log
      await tx.insert(orderStatusHistory).values({
        orderId: newOrder.id,
        status: initialStatus,
        notes: `Order created by customer. Selected payment method: ${validated.paymentMethod.toUpperCase()}`,
      });

      // F. If coupon used, register usage
      if (couponId) {
        await tx.insert(couponUsages).values({
          couponId,
          userId: user.id,
          orderId: newOrder.id,
        });
      }

      // G. Clear user cart
      await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: orderResult,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Catch custom thrown inventory errors
    if (error.message && error.message.startsWith('OUT_OF_STOCK:')) {
      const parts = error.message.split(':');
      const productName = parts[1];
      const cartItemId = parts[2];
      return NextResponse.json(
        { 
          success: false, 
          message: `Insufficient stock for product: ${productName}.`, 
          code: 'OUT_OF_STOCK',
          data: { cartItemId, productName }
        },
        { status: 400 }
      );
    }

    console.error('Checkout API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during order creation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
