import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/customer/Navbar';
import BottomNav from '@/components/customer/BottomNav';
import PwaRegister from '@/components/customer/PwaRegister';
import { getCurrentUser } from '@/lib/services/auth';
import AuthErrorBanner from '@/components/customer/AuthErrorBanner';

import Footer from '@/components/customer/Footer';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'E-Market - Premium Multi-Business Marketplace',
  description: 'Order fresh groceries, vegetables, dairy, meat, cloud kitchen meals, and manage subscriptions.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'E-Market',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = user ? user.roles.some((role: string) => ['Super Admin', 'Admin', 'Store Manager'].includes(role)) : false;
  const username = user ? user.name : null;

  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <PwaRegister />
        <Navbar isAdmin={isAdmin} username={username} />
        <AuthErrorBanner />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
