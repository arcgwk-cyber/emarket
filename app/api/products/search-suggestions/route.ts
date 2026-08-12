import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { or, ilike, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Query matching products
    const matchingProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        type: sql`'product'::text`,
      })
      .from(products)
      .where(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.sku, `%${query}%`)
        )
      )
      .limit(5);

    // Query matching categories
    const matchingCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        type: sql`'category'::text`,
      })
      .from(categories)
      .where(ilike(categories.name, `%${query}%`))
      .limit(3);

    return NextResponse.json({
      success: true,
      data: [...matchingProducts, ...matchingCategories],
    });

  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
