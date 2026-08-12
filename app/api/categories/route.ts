import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.status, 'active'));
    
    // Build tree on the server side to minimize database load
    const categoryMap = new Map();
    const roots: any[] = [];
    
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, subcategories: [] });
    });
    
    allCategories.forEach((cat) => {
      const mapped = categoryMap.get(cat.id);
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).subcategories.push(mapped);
      } else {
        roots.push(mapped);
      }
    });

    return NextResponse.json({ success: true, data: roots });

  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
