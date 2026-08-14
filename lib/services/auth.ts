import { db } from '@/lib/db';
import { users, userRoles, roles, rolePermissions, permissions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export interface UserSessionProfile {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  avatarUrl: string | null;
  status: string;
  roles: string[];
}

/**
 * Get current authenticated user details from Supabase and join profile roles
 */
export async function getCurrentUser(): Promise<UserSessionProfile | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Fetch local user record joined with roles
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });

    if (!dbUser) {
      // If user exists in Auth but not in our profile db, we create it dynamically as a Customer
      return await syncOrCreateDbUser(user);
    }

    if (dbUser.status === 'blocked') {
      const supabase = await createClient();
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      mobile: dbUser.mobile,
      avatarUrl: dbUser.avatarUrl,
      status: dbUser.status,
      roles: dbUser.userRoles.map((ur: any) => ur.role.name),
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Check if the user has a specific permission
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  try {
    const userRoleList = await db
      .select({
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const roleNames = userRoleList.map((r: any) => r.roleName);

    // Super Admin bypasses all checks
    if (roleNames.includes('Super Admin')) return true;

    // Query matching role and permission binding
    const records = await db
      .select({
        permName: permissions.name,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(permissions.name, permissionName)
        )
      );

    return records.length > 0;
  } catch (error) {
    console.error('Error verifying permission:', error);
    return false;
  }
}

/**
 * Synchronize and create user inside local database when they sign in the first time
 */
export async function syncOrCreateDbUser(authUser: any): Promise<UserSessionProfile> {
  const email = authUser.email!;
  const name = authUser.user_metadata?.name || email.split('@')[0];
  const mobile = authUser.phone || null;

  // Insert user
  await db.insert(users).values({
    id: authUser.id,
    email,
    name,
    mobile,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      email,
      name,
      mobile,
      updatedAt: new Date(),
    }
  });

  // Assign Customer role by default
  const customerRole = await db.query.roles.findFirst({
    where: eq(roles.name, 'Customer'),
  });

  if (customerRole) {
    const existingRole = await db.query.userRoles.findFirst({
      where: and(
        eq(userRoles.userId, authUser.id),
        eq(userRoles.roleId, customerRole.id)
      ),
    });

    if (!existingRole) {
      await db.insert(userRoles).values({
        userId: authUser.id,
        roleId: customerRole.id,
      });
    }
  }

  return {
    id: authUser.id,
    email,
    name,
    mobile,
    avatarUrl: null,
    status: 'active',
    roles: ['Customer'],
  };
}

/**
 * Check if the application has any Super Admin.
 * Used to allow initial Super Admin setup.
 */
export async function hasSuperAdmin(): Promise<boolean> {
  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.name, 'Super Admin'),
  });

  if (!superAdminRole) return false;

  const adminUsers = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.roleId, superAdminRole.id))
    .limit(1);

  return adminUsers.length > 0;
}
