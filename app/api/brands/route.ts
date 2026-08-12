import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { brands } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.status, 'active'));

    return NextResponse.json({ success: true, data: allBrands });

  } catch (error) {
    console.error('Brands API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
