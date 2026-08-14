import React from 'react';
import CatalogWrapper from '@/components/customer/CatalogWrapper';
import { db } from '@/lib/db';
import { categories, brands, products } from '@/lib/db/schema';
import { eq, and, or, ilike, inArray, gte, lte, sql, desc, asc } from 'drizzle-orm';

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: string;
    dietType?: string;
    dietary?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.q || '';
  const categorySlug = resolvedParams.category || '';
  const brandId = resolvedParams.brand || '';
  const minPrice = resolvedParams.minPrice || '';
  const maxPrice = resolvedParams.maxPrice || '';
  const sortBy = resolvedParams.sortBy || 'newest';
  const dietType = resolvedParams.dietType || '';
  const dietary = resolvedParams.dietary || '';

  let categoriesTree: any[] = [];
  let activeBrands: any[] = [];
  let productsMapped: any[] = [];
  let total = 0;
  let errorMsg = '';

  try {
    // 1. Fetch active categories and reconstruct the tree structure
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.status, 'active'));

    const categoryMap = new Map();
    
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, subcategories: [] });
    });

    allCategories.forEach((cat) => {
      const mapped = categoryMap.get(cat.id);
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).subcategories.push(mapped);
      } else {
        categoriesTree.push(mapped);
      }
    });

    // 2. Fetch active brands list
    activeBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.status, 'active'));

    // 3. Prepare product query conditions
    const conditions: any[] = [sql`${products.status} = 'active'`];

    if (categorySlug) {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, categorySlug),
      });
      if (cat) {
        // Find subcategories to include in hierarchical search
        const subCats = await db.query.categories.findMany({
          where: eq(categories.parentId, cat.id),
        });
        const catIds = [cat.id, ...subCats.map((sc) => sc.id)];
        conditions.push(inArray(products.categoryId, catIds));
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      );
    }

    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }

    if (minPrice) {
      conditions.push(gte(products.sellingPrice, minPrice));
    }
    if (maxPrice) {
      conditions.push(lte(products.sellingPrice, maxPrice));
    }

    if (dietType) {
      conditions.push(eq(products.dietType, dietType));
    }

    if (dietary) {
      const tags = dietary.split(',').filter(Boolean);
      tags.forEach(tag => {
        conditions.push(sql`${tag} = ANY(${products.dietaryPreferences})`);
      });
    }

    // Define sort orders
    let orderBy: any = desc(products.createdAt);
    if (sortBy === 'price_asc') {
      orderBy = asc(products.sellingPrice);
    } else if (sortBy === 'price_desc') {
      orderBy = desc(products.sellingPrice);
    }

    // Fetch initial matched page
    const items = await db.query.products.findMany({
      where: and(...conditions),
      orderBy,
      limit: 24,
      with: {
        category: true,
        brand: true,
        variants: true,
      },
    });

    // Count total matches
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    total = totalCount[0]?.count || 0;

    // Clean data schemas for Client Component hydration
    productsMapped = items.map((prod) => ({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      mrp: prod.mrp,
      sellingPrice: prod.sellingPrice,
      stockType: prod.stockType,
      images: prod.images,
      isFeatured: prod.isFeatured,
      dietType: prod.dietType,
      dietaryPreferences: prod.dietaryPreferences,
      category: {
        name: prod.category.name,
        slug: prod.category.slug,
      },
      brand: prod.brand ? { name: prod.brand.name } : null,
      variants: prod.variants.map((v) => ({
        id: v.id,
        name: v.name,
        mrp: v.mrp,
        sellingPrice: v.sellingPrice,
        stock: v.stock,
      })),
    }));
  } catch (error: any) {
    console.error('Catalog page database query error:', error);
    const cause = error.cause || {};
    errorMsg = `Message: ${error.message}\n` +
               `Underlying Error: ${cause.message || 'N/A'}\n` +
               `Code: ${cause.code || error.code || 'N/A'}\n` +
               `Detail: ${cause.detail || error.detail || 'N/A'}\n` +
               `Hint: ${cause.hint || error.hint || 'N/A'}\n` +
               `Stack: ${error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'N/A'}`;
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center flex flex-col gap-4 font-sans shadow-sm">
        <h2 className="text-xl font-extrabold text-rose-800 dark:text-rose-400">Database connection offline or not initialized</h2>
        <p className="text-sm text-rose-700/90 dark:text-rose-300/90 max-w-xl mx-auto">
          The catalog page encountered an error querying the database. This typically happens when environment variables (like <code className="font-mono bg-rose-100 dark:bg-rose-900/30 px-1 py-0.5 rounded text-rose-800 dark:text-rose-300">DATABASE_URL</code>) are not configured on Vercel or when tables are missing.
        </p>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl text-left font-mono text-xs text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-zinc-800 overflow-x-auto max-h-[160px] max-w-2xl mx-auto w-full shadow-inner">
          {errorMsg}
        </div>
        <p className="text-xs text-zinc-500">
          Tip: Please make sure your database migrations and seed scripts have run and you have imported your environment configuration into your Vercel settings.
        </p>
      </div>
    );
  }

  return (
    <CatalogWrapper
      initialProducts={productsMapped}
      categoriesList={categoriesTree}
      brandsList={activeBrands}
      totalProductsCount={total}
    />
  );
}
