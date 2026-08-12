import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { carts, cartItems, products, productVariants } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1),
});

// 1. Fetch user's cart items
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get or create cart for user
    let userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (!userCart) {
      const [newCart] = await db.insert(carts).values({ userId: user.id }).returning();
      userCart = newCart;
    }

    // Fetch items
    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, userCart.id),
      with: {
        product: true,
        variant: true,
      },
    });

    return NextResponse.json({ success: true, data: items });

  } catch (error) {
    console.error('Fetch cart API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// 2. Add or update items in cart
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
    const validated = cartItemSchema.parse(body);

    // Get or create cart
    let userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (!userCart) {
      const [newCart] = await db.insert(carts).values({ userId: user.id }).returning();
      userCart = newCart;
    }

    const variantIdVal = validated.variantId || null;

    // Check if item already exists in cart
    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, userCart.id),
        eq(cartItems.productId, validated.productId),
        variantIdVal ? eq(cartItems.variantId, variantIdVal) : isNull(cartItems.variantId)
      ),
    });

    if (existingItem) {
      // Update quantity
      await db
        .update(cartItems)
        .set({ 
          quantity: validated.quantity,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      // Insert item
      await db.insert(cartItems).values({
        cartId: userCart.id,
        productId: validated.productId,
        variantId: variantIdVal,
        quantity: validated.quantity,
      });
    }

    return NextResponse.json({ success: true, message: 'Cart updated successfully' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Update cart API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// 3. Delete item or clear cart
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('id');

    const userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (!userCart) {
      return NextResponse.json({ success: true, message: 'Cart already empty' });
    }

    if (cartItemId) {
      // Delete specific item
      await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.id, cartItemId),
            eq(cartItems.cartId, userCart.id)
          )
        );
    } else {
      // Clear entire cart
      await db.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
    }

    return NextResponse.json({ success: true, message: 'Cart updated successfully' });

  } catch (error) {
    console.error('Delete cart API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
