import React from 'react';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { defaultStoreConfig } from '@/app/api/settings/route';
import { RefreshCcw, PackageX, Truck, ShieldAlert } from 'lucide-react';

export default async function ReturnPolicyPage() {
  const record = await db.query.settings.findFirst({
    where: eq(settings.key, 'store_config'),
  });

  const config = record ? (record.value as any) : defaultStoreConfig;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 font-sans flex flex-col gap-8">
      
      {/* Title */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full tracking-wide">
          Store Policy
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
          Return & Exchange Policy
        </h1>
        <p className="text-xs text-zinc-500">
          Last Updated: August 12, 2026 • Governed by {config.companyName}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-10 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-6 text-xs sm:text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed font-medium">
        
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <RefreshCcw className="h-4.5 w-4.5 text-emerald-500" />
            1. Standard Return Window
          </h3>
          <p>
            We offer a hassle-free return policy for selected products purchased on {config.storeName}. Returns must be requested within <strong>7 days</strong> of delivery through your customer account panel.
          </p>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <PackageX className="h-4.5 w-4.5 text-emerald-500" />
            2. Category Exemptions & Non-Returnable Items
          </h3>
          <p>
            Due to hygiene, safety, and perishable nature, the following categories have restricted or zero returns:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
              <span className="font-extrabold text-zinc-800 dark:text-zinc-200">Fresh Meat / Chicken / Fish</span>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                No returns accepted after delivery. Please inspect the product at the doorstep during OTP delivery confirmation.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
              <span className="font-extrabold text-zinc-800 dark:text-zinc-200">Dairy Products & Eggs</span>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Return allowed only if packaging is defective or damaged at delivery, within 24 hours.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
              <span className="font-extrabold text-zinc-800 dark:text-zinc-200">Cloud Kitchen Meals</span>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Perishable hot cooked foods cannot be returned once delivered. Refunds generated only for incorrect item delivery.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
              <span className="font-extrabold text-zinc-800 dark:text-zinc-200">General Groceries</span>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Full 7-day return allowed if products are unopened, tags intact, and in original packaging.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <Truck className="h-4.5 w-4.5 text-emerald-500" />
            3. Doorstep Pickup & Verification
          </h3>
          <p>
            Once a return request is approved by our support staff, a reverse pickup will be scheduled. Our delivery agent will visit your address to collect the product. The agent will check:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-1 mt-1 font-medium">
            <li>Product matches the SKU/barcode in the original order.</li>
            <li>No signs of usage or package tampering.</li>
            <li>Invoice/bill copy is present.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <ShieldAlert className="h-4.5 w-4.5 text-emerald-500" />
            4. Abuse of Return Policies
          </h3>
          <p>
            E-Market reserves the right to lock accounts or deny return requests for users exhibiting fraudulent behaviours, excessive return ratios, or staging fake product claims under the Indian Penal Code (IPC) Sections 415/420 on cheating.
          </p>
        </section>

      </div>

    </div>
  );
}
