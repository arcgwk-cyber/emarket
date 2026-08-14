import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import ProductDetailWrapper from '@/components/customer/ProductDetailWrapper';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // 1. Fetch matching product with category, brand, and variants relations
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      category: true,
      brand: true,
      variants: true,
    },
  });

  if (!product || product.status !== 'active') {
    notFound();
  }

  // 2. Fetch related items in the same category (limit 6)
  const related = await db.query.products.findMany({
    where: and(
      eq(products.categoryId, product.categoryId),
      ne(products.id, product.id),
      eq(products.status, 'active')
    ),
    limit: 6,
  });

  // 3. Map database schema to client components interfaces
  const mappedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    shortDescription: product.shortDescription,
    mrp: product.mrp,
    sellingPrice: product.sellingPrice,
    stockType: product.stockType,
    images: product.images,
    isVariableWeight: product.isVariableWeight,
    category: {
      name: product.category.name,
      slug: product.category.slug,
    },
    brand: product.brand ? { name: product.brand.name } : null,
    dietType: product.dietType,
    dietaryPreferences: product.dietaryPreferences,
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      mrp: v.mrp,
      sellingPrice: v.sellingPrice,
      stock: v.stock,
      weightG: v.weightG,
      images: v.images,
      attributes: (v.attributes as Record<string, string>) || {},
    })),
  };

  return (
    <ProductDetailWrapper 
      product={mappedProduct} 
      relatedProducts={related} 
    />
  );
}
