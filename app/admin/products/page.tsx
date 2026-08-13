import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { products, categories, brands } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import ProductsManager from '@/components/admin/ProductsManager';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
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

  // Fetch all products (excluding soft-deleted ones)
  const allProducts = await db.query.products.findMany({
    where: isNull(products.deletedAt),
    with: {
      category: true,
      brand: true,
    },
  });

  // Fetch categories and brands list for forms selection
  const categoriesList = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.status, 'active'));
  const brandsList = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.status, 'active'));

  // Map product properties to match UI component expectations
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
    category: p.category ? { name: p.category.name } : null,
    brand: p.brand ? { name: p.brand.name } : null,
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <ProductsManager 
        initialProducts={mappedProducts} 
        categoriesList={categoriesList} 
        brandsList={brandsList} 
      />
    </div>
  );
}
