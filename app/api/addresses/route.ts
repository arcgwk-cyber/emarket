import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { customerAddresses } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/services/auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  recipientName: z.string().min(2, 'Name must be at least 2 characters'),
  recipientMobile: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  houseFlat: z.string().min(1, 'House/Flat is required'),
  building: z.string().optional(),
  street: z.string().min(2, 'Street name is required'),
  area: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(5, 'Pincode is required'),
  country: z.string().default('India'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  addressType: z.string().default('home'), // home, office, parents, friend, other
  deliveryInstructions: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// 1. Fetch saved addresses
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const list = await db.query.customerAddresses.findMany({
      where: eq(customerAddresses.userId, user.id),
      orderBy: desc(customerAddresses.createdAt),
    });

    return NextResponse.json({ success: true, data: list });

  } catch (error) {
    console.error('Fetch addresses API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// 2. Save or update address
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
    const validated = addressSchema.parse(body);

    // If marked default, unset existing default addresses for user first
    if (validated.isDefault) {
      await db
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.userId, user.id));
    }

    if (validated.id) {
      // Update existing address
      const [updated] = await db
        .update(customerAddresses)
        .set({
          recipientName: validated.recipientName,
          recipientMobile: validated.recipientMobile,
          houseFlat: validated.houseFlat,
          building: validated.building || null,
          street: validated.street,
          area: validated.area || null,
          landmark: validated.landmark || null,
          city: validated.city,
          state: validated.state,
          pincode: validated.pincode,
          country: validated.country,
          latitude: validated.latitude || null,
          longitude: validated.longitude || null,
          addressType: validated.addressType,
          deliveryInstructions: validated.deliveryInstructions || null,
          isDefault: validated.isDefault,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customerAddresses.id, validated.id),
            eq(customerAddresses.userId, user.id)
          )
        )
        .returning();

      return NextResponse.json({ success: true, data: updated, message: 'Address updated successfully' });
    } else {
      // Create new address
      const [newAddress] = await db
        .insert(customerAddresses)
        .values({
          userId: user.id,
          recipientName: validated.recipientName,
          recipientMobile: validated.recipientMobile,
          houseFlat: validated.houseFlat,
          building: validated.building || null,
          street: validated.street,
          area: validated.area || null,
          landmark: validated.landmark || null,
          city: validated.city,
          state: validated.state,
          pincode: validated.pincode,
          country: validated.country,
          latitude: validated.latitude || null,
          longitude: validated.longitude || null,
          addressType: validated.addressType,
          deliveryInstructions: validated.deliveryInstructions || null,
          isDefault: validated.isDefault,
        })
        .returning();

      return NextResponse.json({ success: true, data: newAddress, message: 'Address saved successfully' });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Save address API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// 3. Delete saved address
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json(
        { success: false, message: 'Missing address ID', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    await db
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.userId, user.id)
        )
      );

    return NextResponse.json({ success: true, message: 'Address deleted successfully' });

  } catch (error) {
    console.error('Delete address API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
