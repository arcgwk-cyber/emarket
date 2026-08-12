import React from 'react';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { defaultStoreConfig } from '@/app/api/settings/route';
import { ShieldAlert, Fingerprint, RefreshCw, KeyRound } from 'lucide-react';

export default async function PrivacyPage() {
  const record = await db.query.settings.findFirst({
    where: eq(settings.key, 'store_config'),
  });

  const config = record ? (record.value as any) : defaultStoreConfig;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 font-sans flex flex-col gap-8">
      
      {/* Title */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full tracking-wide">
          Data Security
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
          Privacy Policy & Consent
        </h1>
        <p className="text-xs text-zinc-500">
          Last Updated: August 12, 2026 • Compliant under Digital Personal Data Protection (DPDP) Act, 2023 & Section 43A of IT Act, 2000
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-10 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-6 text-xs sm:text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed font-medium">
        
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <Fingerprint className="h-4.5 w-4.5 text-emerald-500" />
            1. Consent & Data We Collect
          </h3>
          <p>
            In compliance with the <strong>DPDP Act, 2023</strong>, E-Market (operated by <strong>{config.companyName}</strong>) acts as the Data Fiduciary. By creating an account, you provide explicit, revocable consent to collect the following:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5 mt-2">
            <li><strong>Identity & Contact:</strong> Name, mobile phone number, delivery address, and email coordinates.</li>
            <li><strong>Financial transactions:</strong> Bank details, card details, or UPI IDs processed via secure payment gateways (Razorpay). We do not store raw credit/debit card numbers.</li>
            <li><strong>Device parameters:</strong> IP addresses, geographic location tracking for delivery dispatches, PWA manifest, and caching cookies.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <KeyRound className="h-4.5 w-4.5 text-emerald-500" />
            2. Purpose of Collection & Storage Limits
          </h3>
          <p>
            Your personal data is collected specifically for the execution of digital retail contracts, driver delivery routing, and dispatching order confirmations via SMS, WhatsApp, and email.
          </p>
          <p className="mt-2">
            We store data only as long as necessary to complete operational dispatches, tax reporting, or legal audits, in compliance with standard storage limitation rules.
          </p>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <RefreshCw className="h-4.5 w-4.5 text-emerald-500" />
            3. User Rights under DPDP Act, 2023
          </h3>
          <p>
            As a Data Principal (customer), you hold legal rights under the DPDP Act to:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5 mt-1.5">
            <li><strong>Right to Access:</strong> Request a copy of all stored profile parameters.</li>
            <li><strong>Right to Correction & Erasure:</strong> Edit saved addresses or request deletion of account databases (subject to completion of pending orders).</li>
            <li><strong>Right to Withdraw Consent:</strong> Revoke authorization for cookie tracking or marketing messages.</li>
          </ul>
          <p className="mt-2">
            To execute any of these rights, please email our Grievance Officer: <strong>{config.grievanceOfficerEmail}</strong>.
          </p>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <ShieldAlert className="h-4.5 w-4.5 text-emerald-500" />
            4. Information Security (Section 43A of IT Act, 2000)
          </h3>
          <p>
            We implement Reasonable Security Practices and Procedures (RSPP), including SSL encryption (HTTPS), cryptographic password hashing, cookie-based session locks via edge proxy interceptors, and relational database row access controls to protect your sensitive personal data from unauthorized access or leakage.
          </p>
        </section>

      </div>

    </div>
  );
}
