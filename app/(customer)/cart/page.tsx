import React from 'react';
import CartWrapper from '@/components/customer/CartWrapper';
import { getCurrentUser } from '@/lib/services/auth';
import { db } from '@/lib/db';
import { carts, cartItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
    
    items = dbItems.map((item: any) => ({
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
