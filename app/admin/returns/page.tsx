import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';
import ReturnsManager from '@/components/admin/ReturnsManager';

export const dynamic = 'force-dynamic';

export default async function AdminReturnsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/returns');
  }

  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  return <ReturnsManager />;
}
