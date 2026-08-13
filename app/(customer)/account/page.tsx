import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';
import AccountWrapper from '@/components/customer/AccountWrapper';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/account');
  }

  return (
    <div className="py-6">
      <AccountWrapper user={user} />
    </div>
  );
}
