import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
    const hasAccess = user.roles.some(role => allowedRoles.includes(role));
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const list = await db.query.coupons.findMany({
      orderBy: [desc(coupons.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error: any) {
    console.error('Fetch coupons admin API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
    const hasAccess = user.roles.some(role => allowedRoles.includes(role));
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimit,
      perCustomerLimit,
      isActive,
    } = body;

    if (!code || !discountType || !discountValue || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Missing required coupon fields (code, discountType, discountValue, startDate, endDate)' },
        { status: 400 }
      );
    }

    // Check duplicate code
    const existingCode = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.trim().toUpperCase()),
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, message: `Coupon with code "${code.trim().toUpperCase()}" already exists` },
        { status: 400 }
      );
    }

    const [newCoupon] = await db.insert(coupons).values({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: discountValue.toString(),
      minOrderAmount: minOrderAmount ? minOrderAmount.toString() : '0.00',
      maxDiscountAmount: maxDiscountAmount ? maxDiscountAmount.toString() : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit) : 1,
      isActive: isActive !== undefined ? !!isActive : true,
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Coupon created successfully',
      data: newCoupon,
    });
  } catch (error: any) {
    console.error('Create coupon admin API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
