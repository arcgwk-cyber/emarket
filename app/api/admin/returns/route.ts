import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { returns, returnItems, orders, orderItems, products, productVariants, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
    const hasAccess = user.roles.some(role => allowedRoles.includes(role));
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 1. Fetch return requests with order and user details
    const returnsList = await db
      .select({
        id: returns.id,
        returnNumber: returns.returnNumber,
        status: returns.status,
        reason: returns.reason,
        description: returns.description,
        createdAt: returns.createdAt,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(returns)
      .innerJoin(orders, eq(returns.orderId, orders.id))
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(returns.createdAt));

    if (returnsList.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Fetch all return items with product details
    const returnItemsList = await db
      .select({
        id: returnItems.id,
        returnId: returnItems.returnId,
        quantity: returnItems.quantity,
        status: returnItems.status,
        productName: products.name,
        variantName: productVariants.name,
        price: orderItems.price,
      })
      .from(returnItems)
      .innerJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id));

    // 3. Map items to returns
    const mapped = returnsList.map(ret => {
      const items = returnItemsList.filter(item => item.returnId === ret.id);
      return {
        ...ret,
        items,
      };
    });

    return NextResponse.json({
      success: true,
      data: mapped,
    });

  } catch (error: any) {
    console.error('Fetch returns admin API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
