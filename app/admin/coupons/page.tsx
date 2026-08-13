import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';
import CouponsManager from '@/components/admin/CouponsManager';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin/coupons');
  }

  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  return <CouponsManager />;
}
