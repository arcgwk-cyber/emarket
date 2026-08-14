import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { products, categories, brands } from '@/lib/db/schema';
import { eq, and, or, ilike, isNull, sql, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import ProductsManager from '@/components/admin/ProductsManager';

export const dynamic = 'force-dynamic';

interface AdminProductsPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/products');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  const params = await searchParams;
  const q = params.q || '';
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build sql query conditions
  const conditions: any[] = [isNull(products.deletedAt)];
  if (q.trim()) {
    conditions.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.sku, `%${q}%`),
        ilike(products.description, `%${q}%`)
      )
    );
  }

  // Fetch paginated products list
  const allProducts = await db.query.products.findMany({
    where: and(...conditions),
    orderBy: [desc(products.createdAt)],
    limit,
    offset,
    with: {
      category: true,
      brand: true,
    },
  });

  // Fetch total matching count
  const totalCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(and(...conditions));

  const totalCount = totalCountRes[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Fetch categories and brands list for form selectors
  const categoriesList = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.status, 'active'));
  const brandsList = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.status, 'active'));

  // Map product properties
  const mappedProducts = allProducts.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    brandId: p.brandId,
    description: p.description,
    shortDescription: p.shortDescription,
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    stockType: p.stockType,
    weightG: p.weightG,
    isFeatured: p.isFeatured,
    status: p.status,
    images: p.images,
    category: p.category ? { name: p.category.name } : null,
    brand: p.brand ? { name: p.brand.name } : null,
    dietType: p.dietType,
    dietaryPreferences: p.dietaryPreferences,
  }));

  return (
    <div className="py-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-screen">
      <ProductsManager 
        initialProducts={mappedProducts} 
        categoriesList={categoriesList} 
        brandsList={brandsList}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        initialSearch={q}
      />
    </div>
  );
}
