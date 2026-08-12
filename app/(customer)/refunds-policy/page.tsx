import React from 'react';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { defaultStoreConfig } from '@/app/api/settings/route';
import { Landmark, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

export default async function RefundPolicyPage() {
  const record = await db.query.settings.findFirst({
    where: eq(settings.key, 'store_config'),
  });

  const config = record ? (record.value as any) : defaultStoreConfig;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 font-sans flex flex-col gap-8">
      
      {/* Title */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full tracking-wide">
          Financial Rules
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
          Refund & Payout Policy
        </h1>
        <p className="text-xs text-zinc-500">
          Last Updated: August 12, 2026 • Governed by {config.companyName}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-10 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-6 text-xs sm:text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed font-medium">
        
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <Landmark className="h-4.5 w-4.5 text-emerald-500" />
            1. Refund Triggers & Approvals
          </h3>
          <p>
            Refund logs are programmatically initiated into our financial records under the following scenarios:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5 mt-1.5 font-medium">
            <li><strong>Cancellation before dispatch:</strong> Full 100% refund of prepaid amounts.</li>
            <li><strong>Doors out-of-stock reject:</strong> If any item is marked out-of-stock during checkout verification.</li>
            <li><strong>Approved returns:</strong> Refund processed upon successful physical inspection at our central warehouse.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <Clock className="h-4.5 w-4.5 text-emerald-500" />
            2. Payout Timelines & Channels
          </h3>
          <p>
            Refunds will be processed back to the original source account used during transaction checkout:
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 font-black text-zinc-700 dark:text-zinc-300">
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Refund Channel</th>
                  <th className="p-3">Standard Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 font-medium">
                <tr>
                  <td className="p-3 font-bold">UPI / QR Codes</td>
                  <td className="p-3">Source UPI Bank Account</td>
                  <td className="p-3">24 to 48 Hours</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Cards (Credit/Debit)</td>
                  <td className="p-3">Razorpay Bank Settlements</td>
                  <td className="p-3">5 to 7 Working Days</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Net Banking</td>
                  <td className="p-3">Source Bank Account</td>
                  <td className="p-3">3 to 5 Working Days</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Cash on Delivery (COD)</td>
                  <td className="p-3">UPI payout / NEFT Transfer</td>
                  <td className="p-3">48 Hours (Details required)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <AlertCircle className="h-4.5 w-4.5 text-emerald-500" />
            3. Non-Refundable Components
          </h3>
          <p>
            Please note that selected convenience fees (₹5), packaging fees (₹15), and shipping delivery charges (if dispatched out of warehouse before cancellation request) are non-refundable since they cover logistics operations already completed.
          </p>
        </section>

        <section className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-50 dark:border-zinc-800 pb-2">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            4. Dispute Redressal Contact
          </h3>
          <p>
            If a refund has been marked completed in your E-Market account tracking panel but has not cleared your bank account within the standard timelines above, please raise a dispute with our Grievance Desk: <strong>{config.grievanceOfficerEmail}</strong>. Please quote your original Order ID and Payment reference ID.
          </p>
        </section>

      </div>

    </div>
  );
}
