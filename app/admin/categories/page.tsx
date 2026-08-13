import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import CategoriesManager from '@/components/admin/CategoriesManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/categories');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  // Fetch all categories
  const allCategoriesList = await db.select().from(categories);

  // Map parent category names
  const mappedCategories = allCategoriesList.map((cat) => {
    const parentCat = cat.parentId ? allCategoriesList.find(c => c.id === cat.parentId) : null;
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      status: cat.status,
      parentName: parentCat ? parentCat.name : null,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <CategoriesManager initialCategories={mappedCategories} />
    </div>
  );
}
