import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env variables first
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const email = process.argv[2];
  const roleName = process.argv[3];

  if (!email || !roleName) {
    console.error('\n❌ Error: Missing arguments.');
    console.log('Usage: npx tsx scripts/assign-role.ts <email> <role_name>');
    console.log('Example: npx tsx scripts/assign-role.ts manager@emarket.com "Store Manager"');
    console.log('Available Roles: "Super Admin", "Admin", "Store Manager", "Order Manager", "Kitchen Manager", "Delivery Manager", "Customer"\n');
    process.exit(1);
  }

  // Dynamic import db to ensure dotenv runs first
  const { db } = await import('@/lib/db');
  const { users, roles, userRoles } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');

  console.log(`\n🔍 Searching for user "${email}" and role "${roleName}"...`);

  // 1. Fetch user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });

  if (!dbUser) {
    console.error(`❌ Error: User with email "${email}" not found in local profiles.`);
    console.log('Please ensure the user has signed up or logged in once to sync their profile first.');
    process.exit(1);
  }

  // 2. Fetch role
  const dbRole = await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
  });

  if (!dbRole) {
    console.error(`❌ Error: Role "${roleName}" not found in database.`);
    console.log('Available Roles: "Super Admin", "Admin", "Store Manager", "Order Manager", "Kitchen Manager", "Delivery Manager", "Customer"');
    process.exit(1);
  }

  // 3. Check if assignment exists
  const existingAssign = await db.query.userRoles.findFirst({
    where: and(
      eq(userRoles.userId, dbUser.id),
      eq(userRoles.roleId, dbRole.id)
    )
  });

  if (existingAssign) {
    console.log(`ℹ️ User "${email}" is already assigned to role "${roleName}".`);
    process.exit(0);
  }

  // 4. Insert assignment
  await db.insert(userRoles).values({
    userId: dbUser.id,
    roleId: dbRole.id,
  });

  console.log(`\n🎉 Success! Assigned role "${roleName}" to user "${dbUser.name}" (${email}).`);
  console.log('They can now access the admin sections corresponding to this role.\n');
}

run().catch((err) => {
  console.error('Unhandled script failure:', err);
  process.exit(1);
});
