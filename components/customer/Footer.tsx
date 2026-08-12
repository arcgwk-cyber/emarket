import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { defaultStoreConfig } from '@/app/api/settings/route';
import { Mail, Phone, MapPin } from 'lucide-react';

export default async function Footer() {
  let config = defaultStoreConfig;
  try {
    const record = await db.query.settings.findFirst({
      where: eq(settings.key, 'store_config'),
    });
    if (record) {
      config = record.value as any;
    }
  } catch (e) {
    // Catch database offline errors during static compilation
  }

  return (
    <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 py-12 pb-24 md:pb-12 text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Column 1: Brand Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {config.storeName}
          </h3>
          <p className="leading-relaxed">
            Multi-business eCommerce supermarket delivering fresh meat, organic produce, dairy items, and meal boxes directly to you.
          </p>
          <div className="flex gap-4 mt-2">
            {config.socialMedia?.facebook && (
              <a 
                href={config.socialMedia.facebook} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-emerald-500 transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                </svg>
              </a>
            )}
            {config.socialMedia?.instagram && (
              <a 
                href={config.socialMedia.instagram} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-emerald-500 transition-colors"
              >
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            )}
            {config.socialMedia?.twitter && (
              <a 
                href={config.socialMedia.twitter} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-emerald-500 transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Quick Shop
          </h4>
          <Link href="/catalog" className="hover:text-emerald-500 transition-colors">All Products</Link>
          <Link href="/catalog?category=vegetables" className="hover:text-emerald-500 transition-colors">Fresh Vegetables</Link>
          <Link href="/catalog?category=dairy-eggs" className="hover:text-emerald-500 transition-colors">Dairy & Eggs</Link>
          <Link href="/catalog?category=cloud-kitchen" className="hover:text-emerald-500 transition-colors">Meals on Demand</Link>
        </div>

        {/* Column 3: Corporate compliance links */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Corporate & Legal
          </h4>
          <Link href="/about" className="hover:text-emerald-500 transition-colors">About Us</Link>
          <Link href="/terms" className="hover:text-emerald-500 transition-colors">Terms & Conditions</Link>
          <Link href="/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
          <Link href="/returns-policy" className="hover:text-emerald-500 transition-colors">Return Policy</Link>
          <Link href="/refunds-policy" className="hover:text-emerald-500 transition-colors">Refund Policy</Link>
        </div>

        {/* Column 4: Address Contact */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Reach Us
          </h4>
          <div className="flex items-start gap-2 leading-relaxed">
            <MapPin className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{config.registeredAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span>{config.supportPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span>{config.supportEmail}</span>
          </div>
        </div>

      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 text-center font-bold text-[10px] text-zinc-400">
        <p>{config.footerText}</p>
        <p className="mt-1">Compliant under Consumer Protection (E-Commerce) Rules, 2020 of India.</p>
      </div>
    </footer>
  );
}
