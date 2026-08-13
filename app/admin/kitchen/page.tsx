import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders, orderItems, products, categories } from '@/lib/db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import KitchenDashboard from '@/components/admin/KitchenDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminKitchenPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/kitchen');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager', 'Kitchen Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // 1. Fetch category IDs corresponding to Cloud Kitchen & Meals
  const kitchenCategories = await db.query.categories.findMany({
    where: and(
      eq(categories.status, 'active'),
      sql`${categories.slug} IN ('cloud-kitchen', 'meals-on-demand', 'healthy-diet')`
    ),
  });

  let mappedKitchenOrders: any[] = [];

  if (kitchenCategories.length > 0) {
    // Fetch subcategories
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
      orderBy: desc(orders.createdAt),
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });

    // 3. Filter orders to only return entries containing kitchen items
    for (const order of preparingOrders) {
      const kitchenItems = order.items.filter((item: any) =>
        categoryIds.includes(item.product.categoryId)
      );

      if (kitchenItems.length > 0) {
        mappedKitchenOrders.push({
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
            preparationTimeMin: 20,
          })),
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <KitchenDashboard initialOrders={mappedKitchenOrders} />
    </div>
  );
}
