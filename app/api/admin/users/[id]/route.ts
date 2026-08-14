import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userRoles, roles, customerAddresses } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const userUpdateSchema = z.object({
  action: z.enum(['status', 'roles', 'reset-password']),
  status: z.enum(['active', 'blocked']).optional(),
  roles: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Instantiate Supabase Admin client if service role key is present
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Role check: Only Super Admin and Admin can manage user roles and status
    const isAllowed = actor.roles.includes('Super Admin') || actor.roles.includes('Admin');
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Admin access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;
    
    // Prevent modifying self
    if (targetUserId === actor.id) {
      return NextResponse.json(
        { success: false, message: 'You cannot modify your own account roles or status.', code: 'SELF_MODIFICATION' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = userUpdateSchema.parse(body);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 1. UPDATE STATUS (Active / Blocked Login)
    if (validated.action === 'status') {
      const newStatus = validated.status!;
      
      await db.update(users)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(users.id, targetUserId));

      // If Supabase Admin Client is active, block auth login there too
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          ban_duration: newStatus === 'blocked' ? 'infinite' : 'none',
        });
      }

      return NextResponse.json({
        success: true,
        message: `User login status successfully updated to ${newStatus.toUpperCase()}`,
      });
    }

    // 2. ASSIGN / REMOVE ROLES
    if (validated.action === 'roles') {
      const selectedRoleNames = validated.roles!;

      // Verify roles exist in DB
      const dbRoles = await db.query.roles.findMany({
        where: inArray(roles.name, selectedRoleNames),
      });

      if (dbRoles.length !== selectedRoleNames.length) {
        return NextResponse.json(
          { success: false, message: 'One or more selected roles are invalid.', code: 'INVALID_ROLES' },
          { status: 400 }
        );
      }

      // Wrap role deletion and insertion inside transaction
      await db.transaction(async (tx) => {
        // Clear existing role assignments
        await tx.delete(userRoles).where(eq(userRoles.userId, targetUserId));

        // Insert new assignments
        for (const roleObj of dbRoles) {
          await tx.insert(userRoles).values({
            userId: targetUserId,
            roleId: roleObj.id,
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: 'User roles updated successfully',
      });
    }

    // 3. RESET PASSWORD
    if (validated.action === 'reset-password') {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Supabase Admin service role key is not configured in .env. Cannot reset passwords programmatically.', 
            code: 'ADMIN_KEY_MISSING' 
          },
          { status: 501 }
        );
      }

      const newPassword = validated.password!;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (error) {
        return NextResponse.json(
          { success: false, message: error.message || 'Failed to update auth password', code: 'AUTH_API_ERROR' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User password reset successfully in Supabase Auth',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.issues, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Update admin user PATCH error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Role check: Only Super Admin and Admin can delete users
    const isAllowed = actor.roles.includes('Super Admin') || actor.roles.includes('Admin');
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Admin access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;

    // Prevent deleting self
    if (targetUserId === actor.id) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account.', code: 'SELF_DELETION' },
        { status: 400 }
      );
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Try deleting from Supabase Auth first
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (error) {
        console.warn('Supabase Auth user deletion failed or user already deleted:', error.message);
      }
    }

    // Try deleting locally, fallback to blocking if constraints restrict deletion
    try {
      await db.transaction(async (tx) => {
        // Delete role assignments
        await tx.delete(userRoles).where(eq(userRoles.userId, targetUserId));
        // Delete saved addresses
        await tx.delete(customerAddresses).where(eq(customerAddresses.userId, targetUserId));
        // Delete user profile
        await tx.delete(users).where(eq(users.id, targetUserId));
      });

      return NextResponse.json({
        success: true,
        message: 'User account and profile data deleted successfully.',
      });

    } catch (dbError: any) {
      console.warn('Postgres delete blocked by constraints. Falling back to block/lock status updates:', dbError.message);
      // Fallback: If they have order history, we block/suspend them instead of deleting
      await db.update(users)
        .set({ status: 'blocked', updatedAt: new Date() })
        .where(eq(users.id, targetUserId));

      return NextResponse.json({
        success: true,
        message: 'User profile has active order history. Account login has been permanently blocked instead of deletion.',
        code: 'BLOCKED_INSTEAD_OF_DELETE',
      });
    }

  } catch (error: any) {
    console.error('Delete admin user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
