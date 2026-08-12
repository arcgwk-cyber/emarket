import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SettingsForm from '@/components/admin/SettingsForm';
import { defaultStoreConfig } from '@/app/api/settings/route';
import { getCurrentUser, hasPermission } from '@/lib/services/auth';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirect=/admin/settings');
  }

  const canManageSettings = await hasPermission(user.id, 'manage_settings');
  if (!canManageSettings) {
    redirect('/');
  }

  // 1. Fetch store settings configuration directly
  const record = await db.query.settings.findFirst({
    where: eq(settings.key, 'store_config'),
  });

  const config = record ? (record.value as any) : defaultStoreConfig;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 py-6">
      <SettingsForm initialConfig={config} />
    </div>
  );
}
