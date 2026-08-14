import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const canAccess = await hasPermission(user.id, 'manage_orders');
    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Staff access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const ordersList = await db.query.orders.findMany({
      orderBy: desc(orders.createdAt),
      limit,
      with: {
        shippingAddress: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });

    const mappedOrders = ordersList.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString(),
      totalAmount: o.totalAmount,
      recipientName: o.recipientName || 'Customer',
      recipientMobile: o.recipientMobile || '—',
      deliveryDate: o.deliveryDate,
      deliveryInstructions: o.deliveryInstructions,
      shippingAddress: o.shippingAddress ? {
        houseFlat: o.shippingAddress.houseFlat,
        building: o.shippingAddress.building || null,
        street: o.shippingAddress.street,
        area: o.shippingAddress.area || null,
        landmark: o.shippingAddress.landmark || null,
        city: o.shippingAddress.city,
        state: o.shippingAddress.state,
        pincode: o.shippingAddress.pincode,
      } : null,
      items: o.items.map(i => ({
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        finalPrice: i.finalPrice,
        product: {
          name: i.product.name,
        },
        variant: i.variant ? {
          name: i.variant.name,
        } : null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: mappedOrders,
    });

  } catch (error: any) {
    console.error('Fetch admin orders API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
