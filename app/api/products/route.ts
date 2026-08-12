import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq, and, or, ilike, inArray, gte, lte, sql, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const categorySlug = searchParams.get('category') || '';
    const brandId = searchParams.get('brand') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, price_asc, price_desc, rating_desc
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const conditions: any[] = [sql`${products.status} = 'active'`];

    // 1. Hierarchical Category Filtering
    if (categorySlug) {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, categorySlug),
      });

      if (cat) {
        // Fetch subcategories
        const subCats = await db.query.categories.findMany({
          where: eq(categories.parentId, cat.id),
        });
        
        const catIds = [cat.id, ...subCats.map((sc) => sc.id)];
        conditions.push(inArray(products.categoryId, catIds));
      } else {
        // Category slug not found -> return empty array
        return NextResponse.json({
          success: true,
          data: { items: [], pagination: { total: 0, limit, offset } }
        });
      }
    }

    // 2. Search Filter
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.shortDescription, `%${search}%`)
        )
      );
    }

    // 3. Brand Filter
    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }

    // 4. Price range filters
    if (minPrice) {
      conditions.push(gte(products.sellingPrice, minPrice));
    }
    if (maxPrice) {
      conditions.push(lte(products.sellingPrice, maxPrice));
    }

    // 5. Sorting configurations
    let orderBy: any = desc(products.createdAt);
    if (sortBy === 'price_asc') {
      orderBy = asc(products.sellingPrice);
    } else if (sortBy === 'price_desc') {
      orderBy = desc(products.sellingPrice);
    } else if (sortBy === 'rating_desc') {
      orderBy = desc(products.isFeatured);
    }

    // 6. DB Query
    const items = await db.query.products.findMany({
      where: and(...conditions),
      orderBy,
      limit,
      offset,
      with: {
        variants: true,
        category: true,
        brand: true,
      },
    });

    // 7. Count matching products
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const total = totalCount[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          limit,
          offset,
        },
      },
    });

  } catch (error) {
    console.error('Products query API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
