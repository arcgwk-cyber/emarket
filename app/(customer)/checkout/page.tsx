import React from 'react';
import { redirect } from 'next/navigation';
import CheckoutFlow from '@/components/customer/CheckoutFlow';
import { getCurrentUser } from '@/lib/services/auth';
import { db } from '@/lib/db';
import { 
  customerAddresses, 
  deliverySlots, 
  carts, 
  cartItems 
} from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirect=/checkout');
  }

  // 1. Fetch user's cart reference
  const userCart = await db.query.carts.findFirst({
    where: eq(carts.userId, user.id),
  });

  if (!userCart) {
    redirect('/cart');
  }

  // 2. Fetch cart items to check bounds
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

  if (validItems.length === 0) {
    redirect('/cart');
  }

  // 3. Fetch saved customer addresses
  const savedAddresses = await db.query.customerAddresses.findMany({
    where: eq(customerAddresses.userId, user.id),
    orderBy: desc(customerAddresses.createdAt),
  });

  // 4. Fetch active delivery slots
  const activeSlots = await db.query.deliverySlots.findMany({
    where: eq(deliverySlots.isActive, true),
  });

  // 5. Map schemas to component interfaces & compute subtotal
  let subtotal = 0;
  
  const mappedCartItems = validItems.map((item: any) => {
    const price = item.variant ? item.variant.sellingPrice : item.product.sellingPrice;
    subtotal += parseFloat(price) * item.quantity;
    
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: price,
      name: item.variant ? `${item.product.name} (${item.variant.name})` : item.product.name,
    };
  });

  const mappedAddresses = savedAddresses.map((addr) => ({
    id: addr.id,
    recipientName: addr.recipientName,
    recipientMobile: addr.recipientMobile,
    houseFlat: addr.houseFlat,
    building: addr.building,
    street: addr.street,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    addressType: addr.addressType,
    deliveryInstructions: addr.deliveryInstructions,
    isDefault: addr.isDefault,
  }));

  const mappedSlots = activeSlots.map((slot) => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    deliveryCharge: slot.deliveryCharge,
    minOrderAmount: slot.minOrderAmount,
  }));

  return (
    <div className="py-10">
      <CheckoutFlow
        addresses={mappedAddresses}
        slots={mappedSlots}
        cartItems={mappedCartItems}
        subtotal={subtotal}
      />
    </div>
  );
}
