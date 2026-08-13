import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, businesses } from '@/lib/db/schema';
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
    const { name, description, imageUrl, parentId, status = 'active' } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 1. Fetch default business
    const business = await db.query.businesses.findFirst();
    if (!business) {
      return NextResponse.json(
        { success: false, message: 'System business not configured.', code: 'SYSTEM_ERROR' },
        { status: 500 }
      );
    }

    // 2. Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // 3. Check duplicate slug under same business
    const existingSlug = await db.query.categories.findFirst({
      where: and(
        eq(categories.businessId, business.id),
        eq(categories.slug, slug)
      ),
    });

    if (existingSlug) {
      return NextResponse.json(
        { success: false, message: `Category with name/slug "${name}" already exists.`, code: 'DUPLICATE_SLUG' },
        { status: 400 }
      );
    }

    // 4. Insert category
    const [newCat] = await db.insert(categories).values({
      businessId: business.id,
      name: name.trim(),
      slug,
      description: description || null,
      imageUrl: imageUrl || null,
      parentId: parentId || null,
      status: status || 'active',
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: newCat,
    });

  } catch (error: any) {
    console.error('Create category API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
