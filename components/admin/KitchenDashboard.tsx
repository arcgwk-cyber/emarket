'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Utensils, 
  CheckCircle, 
  Clock, 
  Loader2,
  ChevronLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface KitchenItem {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  preparationTimeMin: number;
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  deliveryDate: string | null;
  deliveryInstructions: string | null;
  recipientName: string;
  recipientMobile: string;
  kitchenItems: KitchenItem[];
}

interface KitchenDashboardProps {
  initialOrders: KitchenOrder[];
}

export default function KitchenDashboard({ initialOrders }: KitchenDashboardProps) {
  const router = useRouter();
  const [ticketsList, setTicketsList] = useState<KitchenOrder[]>(initialOrders);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleMarkPrepared = async (orderId: string) => {
    setCompletingId(orderId);

    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          status: 'ready_for_dispatch',
          notes: 'Cloud kitchen meal preparation finished.'
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTicketsList(prev => prev.filter(ticket => ticket.id !== orderId));
        router.refresh();
      } else {
        alert(json.message || 'Failed to update ticket status');
      }
    } catch (err) {
      console.error('Error completing kitchen ticket:', err);
      alert('Network error. Failed to update ticket.');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="space-y-6">
        
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Link 
                href="/admin" 
                className="text-xs font-bold text-zinc-500 hover:text-emerald-500 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Platform Dashboard
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-2 flex items-center gap-2">
              <Utensils className="h-6 w-6 text-emerald-500" />
              Kitchen Preparation Board
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Real-time hot food preparation tickets. Coordinate fresh meal orders and mark them ready for dispatch.
            </p>
          </div>
        </div>

        {/* Tickets Grid */}
        {ticketsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 text-zinc-400">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">No active kitchen orders</h3>
              <p className="text-xs text-zinc-550 mt-1 max-w-xs leading-relaxed font-semibold">
                No orders are in "Preparing" state containing cloud kitchen foods or healthy meals right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {ticketsList.map((ticket) => {
              const isCompleting = completingId === ticket.id;
              
              return (
                <div 
                  key={ticket.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
                >
                  {/* Ticket Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wide">Ticket Number</span>
                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50 mt-0.5">{ticket.orderNumber}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black uppercase dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                        Preparing
                      </span>
                    </div>

                    {/* Customer & Instructions */}
                    <div className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 space-y-1">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">Customer: {ticket.recipientName}</p>
                      {ticket.deliveryInstructions && (
                        <p className="flex items-start gap-1 text-[11px] text-amber-600 bg-amber-50/30 dark:bg-amber-950/10 p-2 rounded-xl border border-amber-100/20">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                          <span>Note: {ticket.deliveryInstructions}</span>
                        </p>
                      )}
                    </div>

                    {/* Kitchen Items list */}
                    <div className="pt-2.5 space-y-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide block">Food Items</span>
                      {ticket.kitchenItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-850/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-855">
                          <div>
                            <p className="font-bold">{item.productName}</p>
                            {item.variantName && (
                              <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">({item.variantName})</p>
                            )}
                          </div>
                          <span className="h-6 min-w-6 px-1.5 flex items-center justify-center rounded bg-emerald-500 text-white text-[11px] font-black">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="pt-3 border-t border-zinc-50 dark:border-zinc-800">
                    <button
                      onClick={() => handleMarkPrepared(ticket.id)}
                      disabled={isCompleting}
                      className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating Ticket...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Prepared & Ready
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
