import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Verify access role
  const allowedRoles = ['Super Admin', 'Admin', 'Store Manager', 'Order Manager', 'Delivery Manager', 'Kitchen Manager'];
  const hasAccess = user.roles.some(role => allowedRoles.includes(role));
  
  if (!hasAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-zinc-50/30 dark:bg-zinc-950/10">
      {/* Sidebar navigation */}
      <AdminSidebar user={{ 
        name: user.name || 'Admin', 
        email: user.email || '', 
        roles: user.roles 
      }} />
      
      {/* Main page content area */}
      <div className="md:pl-64 min-h-screen">
        {children}
      </div>
    </div>
  );
}
