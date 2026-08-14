import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userRoles, roles } from '@/lib/db/schema';
import { eq, ne, desc, and } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const canManage = await hasPermission(adminUser.id, 'manage_users');
    // Allow both Super Admin and Admin to view
    const isAllowed = adminUser.roles.includes('Super Admin') || adminUser.roles.includes('Admin') || canManage;
    
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Admin access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch all users with their roles
    const dbUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });

    const mappedUsers = dbUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name || 'Member',
      mobile: u.mobile || '—',
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      roles: u.userRoles.map((ur: any) => ur.role.name),
    }));

    // Fetch all available roles for the select options
    const dbRoles = await db.query.roles.findMany({
      orderBy: desc(roles.name),
    });

    const mappedRoles = dbRoles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: mappedUsers,
        roles: mappedRoles,
      },
    });

  } catch (error: any) {
    console.error('Fetch admin users API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
