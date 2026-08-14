import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Syncing product variants stock count with inventory physical stock...');
  try {
    const { db } = await import('../lib/db');
    const { sql } = await import('drizzle-orm');

    const res = await db.execute(sql`
      UPDATE product_variants pv
      SET stock = COALESCE(
        (SELECT physical_stock 
         FROM inventory inv 
         WHERE inv.variant_id = pv.id 
         LIMIT 1), 
        0
      ),
      updated_at = NOW();
    `);
    console.log('Variants stock synced successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync stock:', err);
    process.exit(1);
  }
}

main();
