import React from 'react';
import CartWrapper from '@/components/customer/CartWrapper';
import { getCurrentUser } from '@/lib/services/auth';
import { db } from '@/lib/db';
import { carts, cartItems } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export default async function CartPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return <CartWrapper initialItems={[]} isLoggedIn={false} />;
  }

  // 1. Fetch user cart reference
  const userCart = await db.query.carts.findFirst({
    where: eq(carts.userId, user.id),
  });

  let items: any[] = [];
  
  if (userCart) {
    // 2. Fetch cart items with product and variant relations
    const dbItems = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, userCart.id),
      with: {
        product: true,
        variant: true,
      },
    });

    const validItems = dbItems.filter((item: any) => item.product !== null);
    
    // Auto-clean database for any deleted product references
    const orphanedIds = dbItems.filter((item: any) => item.product === null).map((item: any) => item.id);
    if (orphanedIds.length > 0) {
      await db.delete(cartItems).where(inArray(cartItems.id, orphanedIds));
    }
    
    items = validItems.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: {
        name: item.product.name,
        slug: item.product.slug,
        mrp: item.product.mrp,
        sellingPrice: item.product.sellingPrice,
        images: item.product.images,
      },
      variant: item.variant ? {
        name: item.variant.name,
        mrp: item.variant.mrp,
        sellingPrice: item.variant.sellingPrice,
      } : null,
    }));
  }

  return <CartWrapper initialItems={items} isLoggedIn={true} />;
}
