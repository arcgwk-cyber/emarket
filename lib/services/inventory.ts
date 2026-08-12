import { db } from '@/lib/db';
import { 
  inventory, 
  inventoryTransactions, 
  orderItems, 
  orders 
} from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Commits reserved inventory to final physical dispatch upon successful payment.
 * Subtracts physical stock and frees the reserved stock lock, writing a ledger entry.
 */
export async function commitReservedInventory(orderId: string, tx: any = db) {
  try {
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
      with: {
        product: true,
      },
    });

    const orderRecord = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!orderRecord) {
      throw new Error(`Order ${orderId} not found during inventory commit`);
    }

    for (const item of items) {
      // Find matching inventory record
      const invRecord = await tx.query.inventory.findFirst({
        where: and(
          eq(inventory.productId, item.productId),
          item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
        ),
      });

      if (invRecord) {
        const physical = invRecord.physicalStock;
        const reserved = invRecord.reservedStock;

        // Deduct both physical and reserved stock
        const newPhysical = Math.max(0, physical - item.quantity);
        const newReserved = Math.max(0, reserved - item.quantity);

        await tx
          .update(inventory)
          .set({
            physicalStock: newPhysical,
            reservedStock: newReserved,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, invRecord.id));

        // Insert inventory ledger transaction record
        await tx.insert(inventoryTransactions).values({
          inventoryId: invRecord.id,
          type: 'sale',
          quantity: -item.quantity, // negative representing decrease
          referenceType: 'order',
          referenceId: orderId,
          notes: `Stock dispatched for order ${orderRecord.orderNumber}`,
        });
      }
    }

    console.log(`✅ Inventory committed successfully for order ${orderId}`);
  } catch (error) {
    console.error('Failed to commit reserved inventory:', error);
    throw error;
  }
}

/**
 * Releases reserved inventory back into available stock upon payment failure or cancellation.
 * Subtracts reserved stock only, keeping physical stock intact.
 */
export async function releaseReservedInventory(orderId: string, tx: any = db) {
  try {
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    for (const item of items) {
      const invRecord = await tx.query.inventory.findFirst({
        where: and(
          eq(inventory.productId, item.productId),
          item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
        ),
      });

      if (invRecord) {
        const reserved = invRecord.reservedStock;
        const newReserved = Math.max(0, reserved - item.quantity);

        await tx
          .update(inventory)
          .set({
            reservedStock: newReserved,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, invRecord.id));
      }
    }

    console.log(`✅ Reserved inventory released successfully for order ${orderId}`);
  } catch (error) {
    console.error('Failed to release reserved inventory:', error);
    throw error;
  }
}
