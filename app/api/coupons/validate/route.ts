import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons, couponUsages } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const validateSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  subtotal: z.number().positive('Subtotal must be positive'),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = validateSchema.parse(body);

    // 1. Fetch coupon details
    const coupon = await db.query.coupons.findFirst({
      where: and(
        eq(coupons.code, validated.code.toUpperCase()),
        eq(coupons.isActive, true)
      ),
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: 'Coupon code is invalid or expired', code: 'INVALID_COUPON' },
        { status: 400 }
      );
    }

    // 2. Validate dates
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return NextResponse.json(
        { success: false, message: 'This coupon code has expired', code: 'COUPON_EXPIRED' },
        { status: 400 }
      );
    }

    // 3. Validate minimum order subtotal
    if (validated.subtotal < parseFloat(coupon.minOrderAmount)) {
      return NextResponse.json(
        { success: false, message: `Minimum order value of ₹${coupon.minOrderAmount} is required for this coupon`, code: 'COUPON_MIN_LIMIT' },
        { status: 400 }
      );
    }

    // 4. Validate customer usage limits
    const userUsageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponUsages)
      .where(
        and(
          eq(couponUsages.couponId, coupon.id),
          eq(couponUsages.userId, user.id)
        )
      );

    const used = userUsageCount[0]?.count || 0;
    if (used >= coupon.perCustomerLimit) {
      return NextResponse.json(
        { success: false, message: 'You have already reached the usage limit for this coupon code', code: 'COUPON_USER_LIMIT' },
        { status: 400 }
      );
    }

    // 5. Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'fixed_amount') {
      discountAmount = parseFloat(coupon.discountValue);
    } else if (coupon.discountType === 'percentage') {
      discountAmount = validated.subtotal * (parseFloat(coupon.discountValue) / 100);
    }

    // Apply max discount cap if configured
    if (coupon.maxDiscountAmount && discountAmount > parseFloat(coupon.maxDiscountAmount)) {
      discountAmount = parseFloat(coupon.maxDiscountAmount);
    }

    // Make sure discount doesn't exceed subtotal
    discountAmount = Math.min(discountAmount, validated.subtotal);

    return NextResponse.json({
      success: true,
      message: 'Coupon code validated successfully',
      data: {
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount.toFixed(2),
        minOrderAmount: coupon.minOrderAmount,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Coupon validation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during validation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
