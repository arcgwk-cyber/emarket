import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, inventory, inventoryTransactions, categories, businesses, stores } from '@/lib/db/schema';
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
    const { products: itemsList } = body;

    if (!itemsList || !Array.isArray(itemsList) || itemsList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No products provided for import', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const business = await db.query.businesses.findFirst();
    const store = await db.query.stores.findFirst();

    if (!business || !store) {
      return NextResponse.json(
        { success: false, message: 'System business or store not configured', code: 'SYSTEM_ERROR' },
        { status: 500 }
      );
    }

    // Load all active categories and create a map name -> id
    const activeCategories = await db.select().from(categories);
    const categoryMap = new Map<string, string>();
    activeCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    const results = await db.transaction(async (tx) => {
      const insertedProducts = [];

      for (const item of itemsList) {
        const {
          name,
          sku,
          categoryName,
          mrp,
          sellingPrice,
          costPrice,
          stockType = 'piece',
          weightG,
          initialStock = 0,
          description,
        } = item;

        if (!name || !sku || !categoryName || !mrp || !sellingPrice) {
          throw new Error(`Missing required fields for SKU ${sku || 'unknown'}: name, sku, categoryName, mrp, and sellingPrice are required.`);
        }

        // Check if SKU exists
        const skuCheck = await tx.query.products.findFirst({
          where: eq(products.sku, sku.toString().trim()),
        });

        if (skuCheck) {
          throw new Error(`Product with SKU "${sku}" already exists in the system.`);
        }

        // Match or create category
        const catKey = categoryName.toString().toLowerCase().trim();
        let catId = categoryMap.get(catKey);

        if (!catId) {
          // Dynamically create category
          const catSlug = catKey.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const [newCat] = await tx.insert(categories).values({
            businessId: business.id,
            name: categoryName.trim(),
            slug: catSlug,
            status: 'active',
          }).returning();

          catId = newCat.id;
          categoryMap.set(catKey, catId); // add to in-memory map
        }

        const slug = name.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Insert product
        const [prod] = await tx.insert(products).values({
          businessId: business.id,
          name: name.toString().trim(),
          slug,
          sku: sku.toString().trim(),
          categoryId: catId,
          description: description || null,
          mrp: mrp.toString(),
          sellingPrice: sellingPrice.toString(),
          costPrice: costPrice ? costPrice.toString() : null,
          stockType: stockType || 'piece',
          weightG: weightG ? parseInt(weightG) : null,
          status: 'active',
        }).returning();

        // Insert inventory
        const [inv] = await tx.insert(inventory).values({
          storeId: store.id,
          productId: prod.id,
          physicalStock: parseInt(initialStock) || 0,
          reservedStock: 0,
          minStockThreshold: 5,
          maxStockThreshold: 500,
        }).returning();

        if (parseInt(initialStock) > 0) {
          await tx.insert(inventoryTransactions).values({
            inventoryId: inv.id,
            type: 'opening_stock',
            quantity: parseInt(initialStock),
            referenceType: 'manual',
            notes: 'Opening stock from bulk CSV import',
          });
        }

        insertedProducts.push(prod);
      }

      return insertedProducts;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results.length} products!`,
      count: results.length,
    });

  } catch (error: any) {
    console.error('Bulk product import error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
