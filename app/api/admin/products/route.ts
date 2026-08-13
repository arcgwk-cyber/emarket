import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, inventory, inventoryTransactions, businesses, stores } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
    const { 
      name, 
      sku, 
      categoryId, 
      brandId, 
      description, 
      shortDescription, 
      mrp, 
      sellingPrice, 
      costPrice, 
      stockType, 
      weightG, 
      isFeatured,
      images = [],
      initialStock = 0
    } = body;

    if (!name || !sku || !categoryId || !mrp || !sellingPrice) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (name, sku, categoryId, mrp, sellingPrice)', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 1. Fetch default business and store
    const business = await db.query.businesses.findFirst();
    const store = await db.query.stores.findFirst();

    if (!business || !store) {
      return NextResponse.json(
        { success: false, message: 'System business or store not configured.', code: 'SYSTEM_ERROR' },
        { status: 500 }
      );
    }

    // 2. Check if SKU already exists
    const existingSku = await db.query.products.findFirst({
      where: eq(products.sku, sku.trim()),
    });

    if (existingSku) {
      return NextResponse.json(
        { success: false, message: `Product with SKU "${sku}" already exists.`, code: 'DUPLICATE_SKU' },
        { status: 400 }
      );
    }

    // 3. Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // 4. Create product inside transaction
    const newProduct = await db.transaction(async (tx) => {
      const [prod] = await tx.insert(products).values({
        businessId: business.id,
        name: name.trim(),
        slug,
        sku: sku.trim(),
        categoryId,
        brandId: brandId || null,
        description: description || null,
        shortDescription: shortDescription || null,
        mrp: mrp.toString(),
        sellingPrice: sellingPrice.toString(),
        costPrice: costPrice ? costPrice.toString() : null,
        stockType: stockType || 'piece',
        weightG: weightG ? parseInt(weightG) : null,
        isFeatured: !!isFeatured,
        images: images && Array.isArray(images) ? images : [],
        status: 'active',
      }).returning();

      // 5. Initialize stock in inventory
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
          notes: 'Opening stock entered during product creation',
        });
      }

      return prod;
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });

  } catch (error: any) {
    console.error('Create product API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
