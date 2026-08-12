import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { carts, cartItems } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const syncSchema = z.array(
  z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
    quantity: z.number().int().min(1),
  })
);

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
    const validated = syncSchema.parse(body);

    if (validated.length === 0) {
      return NextResponse.json({ success: true, message: 'No items to sync' });
    }

    // Get or create database cart
    let userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (!userCart) {
      const [newCart] = await db.insert(carts).values({ userId: user.id }).returning();
      userCart = newCart;
    }

    // Merge logic: matching products updates to max quantity, new ones insert
    for (const item of validated) {
      const variantIdVal = item.variantId || null;
      
      const existing = await db.query.cartItems.findFirst({
        where: and(
          eq(cartItems.cartId, userCart.id),
          eq(cartItems.productId, item.productId),
          variantIdVal ? eq(cartItems.variantId, variantIdVal) : isNull(cartItems.variantId)
        ),
      });

      if (existing) {
        await db
          .update(cartItems)
          .set({ 
            quantity: Math.max(existing.quantity, item.quantity),
            updatedAt: new Date()
          })
          .where(eq(cartItems.id, existing.id));
      } else {
        await db.insert(cartItems).values({
          cartId: userCart.id,
          productId: item.productId,
          variantId: variantIdVal,
          quantity: item.quantity,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Cart merged successfully' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Cart sync API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
