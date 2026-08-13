import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
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
    const { name, description, imageUrl, parentId, status } = body;

    // 1. Verify category exists
    const cat = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!cat) {
      return NextResponse.json(
        { success: false, message: 'Category not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined;

    // 2. Check duplicate slug if name changes
    if (slug && slug !== cat.slug) {
      const existingSlug = await db.query.categories.findFirst({
        where: and(
          eq(categories.businessId, cat.businessId),
          eq(categories.slug, slug)
        ),
      });

      if (existingSlug) {
        return NextResponse.json(
          { success: false, message: `Category with slug "${slug}" already exists.`, code: 'DUPLICATE_SLUG' },
          { status: 400 }
        );
      }
    }

    // 3. Update category
    const [updatedCat] = await db.update(categories)
      .set({
        name: name ? name.trim() : undefined,
        slug: slug,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        parentId: parentId !== undefined ? parentId : undefined,
        status: status || undefined,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCat,
    });

  } catch (error: any) {
    console.error('Update category API error:', error);
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

    // Delete the category from database
    const [deletedCat] = await db.delete(categories)
      .where(eq(categories.id, id))
      .returning();

    if (!deletedCat) {
      return NextResponse.json(
        { success: false, message: 'Category not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      data: deletedCat,
    });

  } catch (error: any) {
    console.error('Delete category API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
