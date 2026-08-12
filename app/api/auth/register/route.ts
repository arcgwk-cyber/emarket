import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userRoles, roles } from '@/lib/db/schema';
import { hasSuperAdmin, syncOrCreateDbUser } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    const supabase = await createClient();

    // 1. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: validated.name,
        },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, message: authError?.message || 'Sign up failed', code: 'AUTH_ERROR' },
        { status: 400 }
      );
    }

    const authUser = authData.user;

    // 2. Sync profile in our PostgreSQL DB
    // Check if the system has any Super Admin
    const systemHasAdmin = await hasSuperAdmin();

    // Insert user profile with conflict handling
    await db.insert(users).values({
      id: authUser.id,
      email: validated.email,
      name: validated.name,
      mobile: validated.mobile || null,
      status: 'active',
    }).onConflictDoUpdate({
      target: users.id,
      set: {
        email: validated.email,
        name: validated.name,
        mobile: validated.mobile || null,
        updatedAt: new Date(),
      }
    });

    // 3. Assign role: If first user, make Super Admin, otherwise Customer
    const roleToAssign = systemHasAdmin ? 'Customer' : 'Super Admin';
    const dbRole = await db.query.roles.findFirst({
      where: eq(roles.name, roleToAssign),
    });

    if (dbRole) {
      await db.insert(userRoles).values({
        userId: authUser.id,
        roleId: dbRole.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: systemHasAdmin 
        ? 'Registration successful' 
        : 'System bootstrapped. Initial Super Admin registered successfully.',
      data: {
        userId: authUser.id,
        email: authUser.email,
        name: validated.name,
        assignedRole: roleToAssign,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
