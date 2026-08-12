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

  // 1. Fetch active categories and reconstruct the tree structure
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.status, 'active'));

  const categoryMap = new Map();
  const categoriesTree: any[] = [];
  
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
  const activeBrands = await db
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

  const total = totalCount[0]?.count || 0;

  // Clean data schemas for Client Component hydration
  const productsMapped = items.map((prod) => ({
    id: prod.id,
    name: prod.name,
    slug: prod.slug,
    mrp: prod.mrp,
    sellingPrice: prod.sellingPrice,
    stockType: prod.stockType,
    images: prod.images,
    isFeatured: prod.isFeatured,
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

  return (
    <CatalogWrapper
      initialProducts={productsMapped}
      categoriesList={categoriesTree}
      brandsList={activeBrands}
      totalProductsCount={total}
    />
  );
}
