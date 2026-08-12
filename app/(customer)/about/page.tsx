import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { defaultStoreConfig } from '@/app/api/settings/route';
import { MapPin, Phone, Mail, Award, CheckCircle, ShieldCheck } from 'lucide-react';

export default async function AboutPage() {
  // Fetch store configuration from DB
  const record = await db.query.settings.findFirst({
    where: eq(settings.key, 'store_config'),
  });

  const config = record ? (record.value as any) : defaultStoreConfig;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* Hero Section */}
      <div className="text-center flex flex-col items-center gap-4 max-w-3xl mx-auto pb-12">
        <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full tracking-wide">
          About Us
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          Welcome to {config.storeName}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
          We are committed to delivering the freshest groceries, high-quality organic meats, dairy products, and meals on-demand directly to your doorstep. Backed by corporate trust and legal compliance, we strive to make your daily cooking experience seamless and healthy.
        </p>
      </div>

      {/* Corporate Binds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mt-6">
        
        {/* Left Card: Company Profile */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider pb-2 border-b border-zinc-50 dark:border-zinc-800">
              Corporate Profile
            </h3>
            <div className="flex flex-col gap-3.5 text-xs text-zinc-650 dark:text-zinc-300 font-medium">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-zinc-400 font-bold">Legal Entity</span>
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{config.companyName}</span>
              </div>

              {config.cin && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-zinc-400 font-bold">Corporate Identity Number (CIN)</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{config.cin}</span>
                </div>
              )}

              {config.gstin && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-zinc-400 font-bold">GSTIN Registration</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{config.gstin}</span>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-zinc-400 font-bold">Registered Office</span>
                <span className="leading-relaxed">{config.registeredAddress}</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex gap-4 border-t border-zinc-50 dark:border-zinc-800 pt-5 mt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4.5 w-4.5" />
              100% Secure Checkout
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4.5 w-4.5" />
              FSSAI Certified
            </div>
          </div>
        </div>

        {/* Right Card: Support & Operational Locations */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider pb-2 border-b border-zinc-50 dark:border-zinc-800">
              Operational Details
            </h3>
            
            <div className="flex flex-col gap-3.5 text-xs text-zinc-650 dark:text-zinc-300 font-medium">
              <div className="flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-zinc-400 font-bold">Grievance Support Email</span>
                  <span className="font-bold">{config.supportEmail}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-zinc-400 font-bold">Helpline Hotline</span>
                  <span className="font-bold">{config.supportPhone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-50 dark:border-zinc-800 pt-5 mt-2">
            <h4 className="text-[10px] font-bold uppercase text-zinc-400">Serviced Areas</h4>
            <div className="flex flex-wrap gap-2">
              {config.locations.map((loc: string) => (
                <span
                  key={loc}
                  className="rounded-full bg-zinc-55 px-3 py-1 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800"
                >
                  {loc}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Google Maps embed code integration if url is provided */}
      {config.googleMapsUrl && (
        <div className="mt-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm overflow-hidden aspect-video max-h-[300px] w-full">
          <iframe
            src={config.googleMapsUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-2xl"
          />
        </div>
      )}

    </div>
  );
}
