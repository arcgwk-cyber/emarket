import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, inventory, productVariants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      images,
      stockAdjustment,
      dietType,
      dietaryPreferences
    } = body;

    // 1. Verify product exists
    const prod = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!prod) {
      return NextResponse.json(
        { success: false, message: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. If SKU is modified, check duplicate
    if (sku && sku.trim() !== prod.sku) {
      const existingSku = await db.query.products.findFirst({
        where: eq(products.sku, sku.trim()),
      });
      if (existingSku) {
        return NextResponse.json(
          { success: false, message: `Product with SKU "${sku}" already exists.`, code: 'DUPLICATE_SKU' },
          { status: 400 }
        );
      }
    }

    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined;

    // 3. Update product within transaction
    const updatedProd = await db.transaction(async (tx) => {
      const [p] = await tx.update(products)
        .set({
          name: name ? name.trim() : undefined,
          slug: slug,
          sku: sku ? sku.trim() : undefined,
          categoryId: categoryId || undefined,
          brandId: brandId !== undefined ? brandId : undefined,
          description: description !== undefined ? description : undefined,
          shortDescription: shortDescription !== undefined ? shortDescription : undefined,
          mrp: mrp !== undefined ? mrp.toString() : undefined,
          sellingPrice: sellingPrice !== undefined ? sellingPrice.toString() : undefined,
          costPrice: costPrice !== undefined ? (costPrice ? costPrice.toString() : null) : undefined,
          stockType: stockType || undefined,
          weightG: weightG !== undefined ? (weightG ? parseInt(weightG) : null) : undefined,
          isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
          images: images !== undefined ? (images && Array.isArray(images) ? images : []) : undefined,
          dietType: dietType !== undefined ? dietType : undefined,
          dietaryPreferences: dietaryPreferences !== undefined ? dietaryPreferences : undefined,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      // 4. Handle stock adjustment if provided
      if (stockAdjustment !== undefined) {
        const adjustment = parseInt(stockAdjustment) || 0;
        if (adjustment !== 0) {
          const invRecord = await tx.query.inventory.findFirst({
            where: eq(inventory.productId, id),
          });
          
          if (invRecord) {
            const newPhysicalStock = invRecord.physicalStock + adjustment;
            await tx.update(inventory)
              .set({
                physicalStock: newPhysicalStock,
                updatedAt: new Date(),
              })
              .where(eq(inventory.id, invRecord.id));

            // Sync stock changes to product_variants table (to prevent frontend out of stock mismatch)
            await tx.update(productVariants)
              .set({
                stock: newPhysicalStock,
                updatedAt: new Date(),
              })
              .where(eq(productVariants.productId, id));
          }
        }
      }

      // 5. Update variant images to match parent product images
      if (images !== undefined && Array.isArray(images)) {
        await tx.update(productVariants)
          .set({ images: images })
          .where(eq(productVariants.productId, id));
      }

      return p;
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProd,
    });

  } catch (error: any) {
    console.error('Update product API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Soft delete the product by setting deletedAt and status = 'inactive'
    const [deletedProd] = await db.update(products)
      .set({
        status: 'inactive',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!deletedProd) {
      return NextResponse.json(
        { success: false, message: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      data: deletedProd,
    });

  } catch (error: any) {
    console.error('Delete product API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
