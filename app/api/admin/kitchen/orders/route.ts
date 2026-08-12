import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  orders, 
  orderItems, 
  products, 
  categories 
} from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Staff check: Only warehouse managers and kitchen preparers can view kitchen dashboard
    const isStaff = await hasPermission(user.id, 'manage_orders');
    if (!isStaff) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Access restricted.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 1. Fetch category IDs corresponding to Cloud Kitchen & Meals
    const kitchenCategories = await db.query.categories.findMany({
      where: and(
        eq(categories.status, 'active'),
        sql`${categories.slug} IN ('cloud-kitchen', 'meals-on-demand', 'healthy-diet')`
      ),
    });

    if (kitchenCategories.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch their subcategories as well
    const subCategoriesList = await db.query.categories.findMany({
      where: inArray(categories.parentId, kitchenCategories.map(c => c.id)),
    });

    const categoryIds = [
      ...kitchenCategories.map(c => c.id),
      ...subCategoriesList.map(sc => sc.id),
    ];

    // 2. Fetch active preparing orders
    const preparingOrders = await db.query.orders.findMany({
      where: eq(orders.status, 'preparing'),
      with: {
        shippingAddress: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });

    // 3. Filter orders to only return entries containing kitchen items
    const kitchenOrders: any[] = [];

    for (const order of preparingOrders) {
      // Filter items to only show those requiring kitchen preparation
      const kitchenItems = order.items.filter((item: any) =>
        categoryIds.includes(item.product.categoryId)
      );

      if (kitchenItems.length > 0) {
        kitchenOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryDate: order.deliveryDate,
          deliveryInstructions: order.deliveryInstructions,
          recipientName: order.recipientName,
          recipientMobile: order.recipientMobile,
          kitchenItems: kitchenItems.map((item: any) => ({
            id: item.id,
            productName: item.product.name,
            variantName: item.variant ? item.variant.name : null,
            quantity: item.quantity,
            preparationTimeMin: 20, // default prep time
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data: kitchenOrders });

  } catch (error) {
    console.error('Kitchen orders API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
