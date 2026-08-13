import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { isNull, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import BulkInwardManager from '@/components/admin/BulkInwardManager';

export const dynamic = 'force-dynamic';

export default async function AdminInwardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/inward');
  }

  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // Fetch active products with nested variants
  const activeProducts = await db.query.products.findMany({
    where: isNull(products.deletedAt),
    orderBy: [desc(products.createdAt)],
    with: {
      variants: true,
    }
  });

  const cleaned = activeProducts.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    variants: p.variants.map(v => ({
      id: v.id,
      name: v.name,
    }))
  }));

  return <BulkInwardManager productsList={cleaned} />;
}
