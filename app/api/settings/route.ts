import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';
import { z } from 'zod';

const storeConfigSchema = z.object({
  storeName: z.string().min(1),
  storeLogo: z.string().url().or(z.string().length(0)),
  supportEmail: z.string().email(),
  supportPhone: z.string().min(10),
  companyName: z.string().min(2),
  registeredAddress: z.string().min(5),
  gstin: z.string().min(15).max(15).toUpperCase().or(z.string().length(0)),
  cin: z.string().min(21).max(21).toUpperCase().or(z.string().length(0)),
  locations: z.array(z.string()),
  socialMedia: z.object({
    facebook: z.string().url().or(z.string().length(0)),
    instagram: z.string().url().or(z.string().length(0)),
    twitter: z.string().url().or(z.string().length(0)),
  }),
  googleMapsUrl: z.string().or(z.string().length(0)),
  googleAnalyticsCode: z.string().or(z.string().length(0)),
  googleTagCode: z.string().or(z.string().length(0)),
  footerText: z.string().min(1),
  grievanceOfficerName: z.string().min(2),
  grievanceOfficerEmail: z.string().email(),
});

// Helper: default configuration if none exists in database
export const defaultStoreConfig = {
  storeName: 'E-Market India',
  storeLogo: '',
  supportEmail: 'support@emarket.in',
  supportPhone: '+91-99999-99999',
  companyName: 'E-Market Retail Private Limited',
  registeredAddress: '12, Barakhamba Road, Connaught Place, New Delhi - 110001',
  gstin: '07AAAAA1111A1Z1',
  cin: 'U74999DL2026PTC123456',
  locations: ['New Delhi', 'Noida', 'Gurugram', 'Faridabad', 'Ghaziabad'],
  socialMedia: {
    facebook: 'https://facebook.com/emarket',
    instagram: 'https://instagram.com/emarket',
    twitter: 'https://twitter.com/emarket',
  },
  googleMapsUrl: '',
  googleAnalyticsCode: '',
  googleTagCode: '',
  footerText: '© 2026 E-Market Retail Private Limited. All rights reserved.',
  grievanceOfficerName: 'Amit Sharma',
  grievanceOfficerEmail: 'grievance@emarket.in',
};

// 1. GET - Fetch store configuration (Public)
export async function GET() {
  try {
    const configRecord = await db.query.settings.findFirst({
      where: eq(settings.key, 'store_config'),
    });

    const data = configRecord ? (configRecord.value as any) : defaultStoreConfig;
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Fetch settings API error:', error);
    return NextResponse.json({ success: true, data: defaultStoreConfig }); // Fallback on DB disconnect
  }
}

// 2. POST - Save/Update store configuration (Admin Only)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Security check: Must have manage_settings permission
    const isStaff = await hasPermission(user.id, 'manage_settings');
    if (!isStaff) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Admin access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = storeConfigSchema.parse(body);

    const existingRecord = await db.query.settings.findFirst({
      where: eq(settings.key, 'store_config'),
    });

    if (existingRecord) {
      await db
        .update(settings)
        .set({
          value: validated,
          updatedAt: new Date(),
        })
        .where(eq(settings.id, existingRecord.id));
    } else {
      await db.insert(settings).values({
        key: 'store_config',
        value: validated,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Store configuration updated successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Update settings API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
