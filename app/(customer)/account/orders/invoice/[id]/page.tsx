import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders, customerAddresses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/services/auth';
import Link from 'next/link';
import { Printer, ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/account/orders/invoice/${id}`);
  }

  // 1. Fetch order details (check user ownership unless admin)
  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: {
        with: {
          product: true,
          variant: true,
        }
      },
      shippingAddress: true,
      store: true,
    }
  });

  if (!orderRecord) {
    return (
      <div className="p-8 text-center font-sans">
        <h2 className="text-sm font-black text-rose-600">Order Not Found</h2>
        <p className="text-xs text-zinc-500 mt-2">The order ID does not exist in our systems.</p>
        <Link href="/account/orders" className="text-xs font-bold text-emerald-600 hover:underline mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  // Verify ownership or staff access
  const isOwner = orderRecord.userId === user.id;
  const isStaff = user.roles.some(role => ['Super Admin', 'Admin', 'Store Manager'].includes(role));
  if (!isOwner && !isStaff) {
    redirect('/');
  }

  // Totals calculations
  const subtotal = parseFloat(orderRecord.totalAmount) - 15 - 5 - (orderRecord.status === 'pending' ? 49 : 0); // reverse calculate estimation
  const deliveryCharge = orderRecord.totalAmount === '0.00' ? 0 : 49; // dummy slot delivery fee mockup estimate
  const packagingFee = 15;
  const convenienceFee = 5;
  const gstTax = subtotal > 0 ? subtotal * 0.05 : 0;
  const discount = 0; // standard mockup coupon display

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4 font-sans print:bg-white print:py-0 print:px-0">
      
      {/* Print Controls (Hidden on Print) */}
      <div className="mx-auto max-w-3xl flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 print:hidden mb-6">
        <Link 
          href="/account/orders" 
          className="text-xs font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 active:scale-95 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <button
          onClick={triggerPrint}
          className="rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-5 py-2.5 shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Print Invoice
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="mx-auto max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-8 sm:p-12 rounded-3xl shadow-sm print:shadow-none print:border-none print:p-0 print:rounded-none">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-black text-emerald-600 uppercase tracking-tight">E-Market</h1>
            <p className="text-[10px] text-zinc-500 font-bold mt-1">ALL-IN-ONE HYBRID MARKETPLACE</p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-xs">
              Kurmannapalem Central Hub, Visakhapatnam, Andhra Pradesh, 530046
            </p>
          </div>
          <div className="text-left sm:text-right space-y-1.5 text-xs text-zinc-500">
            <h2 className="text-lg font-black text-zinc-800 dark:text-zinc-100">TAX INVOICE</h2>
            <p>Invoice No: <strong className="text-zinc-800 dark:text-zinc-100">{orderRecord.orderNumber}</strong></p>
            <p>Date: {new Date(orderRecord.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
            <p>Payment: <span className="uppercase font-bold text-zinc-800 dark:text-zinc-100">{orderRecord.paymentMethod} • {orderRecord.paymentStatus}</span></p>
          </div>
        </div>

        {/* Customer Address section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-zinc-100 dark:border-zinc-800 text-xs">
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2.5">Billed To</h4>
            <p className="font-extrabold text-zinc-800 dark:text-zinc-100 text-sm">{user.name}</p>
            <p className="text-zinc-500 mt-1">{user.email}</p>
            <p className="text-zinc-550 mt-0.5">{user.mobile}</p>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2.5">Shipping Address</h4>
            {orderRecord.shippingAddress ? (
              <div className="text-zinc-600 dark:text-zinc-400 space-y-0.5 leading-relaxed">
                <p className="font-bold">{orderRecord.shippingAddress.recipientName}</p>
                <p>{orderRecord.shippingAddress.houseFlat}</p>
                {orderRecord.shippingAddress.area && <p>{orderRecord.shippingAddress.area}</p>}
                {orderRecord.shippingAddress.landmark && <p>Landmark: {orderRecord.shippingAddress.landmark}</p>}
                <p>Mobile: {orderRecord.shippingAddress.recipientMobile}</p>
              </div>
            ) : (
              <p className="text-zinc-400 italic">Self Pickup at Store Hub</p>
            )}
          </div>
        </div>

        {/* Items Breakdown Table */}
        <div className="py-8">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                <th className="py-3">Sl. No.</th>
                <th className="py-3">Product Description</th>
                <th className="py-3 text-center">Unit Weight</th>
                <th className="py-3 text-center">Unit Price</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {orderRecord.items.map((item, index) => (
                <tr key={item.id} className="text-zinc-700 dark:text-zinc-300">
                  <td className="py-4">{index + 1}</td>
                  <td className="py-4 font-bold text-zinc-900 dark:text-zinc-100">
                    {item.product?.name}
                    {item.variant && (
                      <span className="text-[10px] text-zinc-400 font-medium ml-1.5">
                        ({item.variant.name})
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    {item.variant?.name || (item.product?.weightG ? `${item.product.weightG}g` : '1 Unit')}
                  </td>
                  <td className="py-4 text-center">₹{parseFloat(item.price).toFixed(2)}</td>
                  <td className="py-4 text-center font-bold">{item.quantity}</td>
                  <td className="py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{parseFloat(item.finalPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary grid */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="space-y-2 text-zinc-400 max-w-sm text-left">
            <h4 className="text-[10px] font-bold uppercase tracking-wide">Declaration & Terms</h4>
            <p className="leading-relaxed text-[10px]">
              This is a computer-generated tax invoice and does not require a physical signature. Perishable goods returns are subject to E-Market return policy constraints.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2.5">
            <div className="flex justify-between font-semibold text-zinc-550">
              <span>Items Total:</span>
              <span className="text-zinc-800 dark:text-zinc-200">₹{(parseFloat(orderRecord.totalAmount) - 15 - 5 - (orderRecord.status === 'pending' ? 49 : 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-zinc-555">
              <span>Delivery Charges:</span>
              <span className="text-zinc-800 dark:text-zinc-200">₹{orderRecord.status === 'pending' ? '0.00' : '49.00'}</span>
            </div>
            <div className="flex justify-between font-semibold text-zinc-555">
              <span>Packaging & Safety Fee:</span>
              <span className="text-zinc-800 dark:text-zinc-200">₹15.00</span>
            </div>
            <div className="flex justify-between font-semibold text-zinc-555">
              <span>GST & Taxes (5% Included):</span>
              <span className="text-zinc-800 dark:text-zinc-200">Included</span>
            </div>
            <div className="flex justify-between pt-3.5 border-t border-zinc-150 dark:border-zinc-800 text-sm font-black">
              <span className="text-zinc-900 dark:text-zinc-50">Grand Total:</span>
              <span className="text-emerald-600">₹{parseFloat(orderRecord.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Floating browser print triggers script */}
      <script dangerouslySetInnerHTML={{ __html: `
        function triggerPrint() {
          window.print();
        }
      `}} />
    </div>
  );
}

// Client execution helper bridge injection
const triggerPrint = () => {
  if (typeof window !== 'undefined') {
    window.print();
  }
};
