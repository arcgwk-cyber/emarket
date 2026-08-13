import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq, and, or, ilike, sql, desc, aliasedTable } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import CategoriesManager from '@/components/admin/CategoriesManager';

export const dynamic = 'force-dynamic';

interface AdminCategoriesPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
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

  const params = await searchParams;
  const q = params.q || '';
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build query conditions
  const conditions: any[] = [];
  if (q.trim()) {
    conditions.push(
      or(
        ilike(categories.name, `%${q}%`),
        ilike(categories.slug, `%${q}%`),
        ilike(categories.description, `%${q}%`)
      )
    );
  }

  const parent = aliasedTable(categories, 'parent');

  // Fetch paginated categories with parent names
  const paginatedCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      imageUrl: categories.imageUrl,
      parentId: categories.parentId,
      status: categories.status,
      parentName: parent.name,
    })
    .from(categories)
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(categories.name))
    .limit(limit)
    .offset(offset);

  // Fetch total count
  const totalCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalCount = totalCountRes[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Fetch all categories list for the dropdown parent selectors
  const fullCategoriesList = await db.select({ id: categories.id, name: categories.name }).from(categories);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <CategoriesManager 
        initialCategories={paginatedCategories} 
        fullCategoriesList={fullCategoriesList}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        initialSearch={q}
      />
    </div>
  );
}
