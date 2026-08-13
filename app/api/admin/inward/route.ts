import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventory, inventoryTransactions, products, productVariants, stores } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { productId, variantId, quantity, costPrice, batchNumber, notes } = body;

    if (!productId || !quantity || parseInt(quantity) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Product ID and a positive quantity are required' },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity);

    // 1. Verify product exists
    const prod = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!prod) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. Fetch default store
    const store = await db.query.stores.findFirst();
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'Store configuration not found' },
        { status: 500 }
      );
    }

    // 3. Process stock inward in a transaction
    const result = await db.transaction(async (tx) => {
      // Find existing inventory record
      let invRecord = await tx.query.inventory.findFirst({
        where: variantId 
          ? and(
              eq(inventory.productId, productId),
              eq(inventory.variantId, variantId),
              eq(inventory.storeId, store.id)
            )
          : and(
              eq(inventory.productId, productId),
              eq(inventory.storeId, store.id)
            )
      });

      if (!invRecord) {
        // Create new inventory record
        const [inserted] = await tx.insert(inventory).values({
          storeId: store.id,
          productId,
          variantId: variantId || null,
          physicalStock: qty,
          reservedStock: 0,
          minStockThreshold: 5,
          maxStockThreshold: 500,
        }).returning();
        invRecord = inserted;
      } else {
        // Update existing physical stock
        await tx.update(inventory)
          .set({
            physicalStock: invRecord.physicalStock + qty,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, invRecord.id));
      }

      // 4. Log in inventoryTransactions
      const referenceNotes = [
        notes,
        batchNumber ? `Batch: ${batchNumber}` : '',
        costPrice ? `CP: ₹${costPrice}` : '',
      ].filter(Boolean).join(' | ') || 'Inward bulk stock purchase';

      await tx.insert(inventoryTransactions).values({
        inventoryId: invRecord.id,
        type: 'purchase', // stock inward purchase transaction
        quantity: qty,
        referenceType: 'purchase_inward',
        notes: referenceNotes,
        userId: user.id,
      });

      return {
        inventoryId: invRecord.id,
        newStock: invRecord.physicalStock + qty,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Bulk stock inward processed successfully',
      data: result,
    });

  } catch (error: any) {
    console.error('Bulk stock inward API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
