'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search, 
  Loader2, 
  Calendar, 
  Clipboard, 
  User, 
  Check, 
  X, 
  AlertCircle,
  TrendingDown
} from 'lucide-react';

interface ReturnItem {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  price: string;
}

interface ReturnRequest {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  description: string | null;
  createdAt: string;
  orderId: string;
  orderNumber: string;
  totalAmount: string;
  customerName: string;
  customerEmail: string;
  items: ReturnItem[];
}

export default function ReturnsManager() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Status Change Dialog State
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<string>('under_review');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/returns');
      const json = await res.json();
      if (json.success) {
        setReturns(json.data);
      } else {
        setErrorMsg(json.message || 'Failed to fetch return requests');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to returns API');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;
    setDialogLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/returns/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: selectedReturn.id,
          status: nextStatus,
          notes: notes.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Return status advanced to ${nextStatus.toUpperCase()}`);
        setTimeout(() => setSuccessMsg(''), 3000);
        setSelectedReturn(null);
        setNotes('');
        fetchReturns(); // Reload list
      } else {
        setErrorMsg(json.message || 'Failed to update return status');
      }
    } catch (err) {
      setErrorMsg('Error submitting return status update');
    } finally {
      setDialogLoading(false);
    }
  };

  const formatReason = (reason: string) => {
    return reason.replace(/_/g, ' ').toUpperCase();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'under_review':
      case 'pickup_scheduled':
      case 'picked_up':
      case 'received':
      case 'inspected':
        return 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'completed':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'rejected':
        return 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default:
        return 'bg-zinc-50 border-zinc-100 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  const filteredReturns = returns.filter(ret => 
    ret.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
    ret.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    ret.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
          Returns & Refunds Board
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Review customer item returns, update status checkpoints, and trigger automated invoice refunds.
        </p>
      </div>

      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-3.5 text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-650 rounded-xl">
          ⚠ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
          ✓ {successMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="relative max-w-md w-full">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 pointer-events-none">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder="Search by Return ID, Order ID, Customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 text-xs bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-zinc-750"
        />
      </div>

      {/* Returns List Container */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center p-8 bg-zinc-50/50 dark:bg-zinc-950/5">
          <RefreshCw className="h-10 w-10 text-zinc-300 dark:text-zinc-650 animate-pulse" />
          <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-300 mt-4">No Return Requests Found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Customers have not requested any returns yet. Active returns will populate here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReturns.map((ret) => (
            <div 
              key={ret.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between gap-5 transition-shadow hover:shadow-md"
            >
              {/* Top Row: IDs, status, actions */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md dark:bg-zinc-800 dark:text-zinc-300">
                      {ret.returnNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeClass(ret.status)}`}>
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-450 mt-1">
                    Order: <strong className="text-zinc-700 dark:text-zinc-300">{ret.orderNumber}</strong> • Request Date: {new Date(ret.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>

                {ret.status !== 'completed' && ret.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setSelectedReturn(ret);
                      setNextStatus(ret.status === 'requested' ? 'under_review' : ret.status);
                    }}
                    className="rounded-xl bg-orange-500 hover:bg-orange-660 text-white text-[11px] font-extrabold px-4 py-2 shadow-sm transition-all cursor-pointer"
                  >
                    Manage Return
                  </button>
                )}
              </div>

              {/* Middle Row: Customer and Items breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* Customer column */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Customer Details</h4>
                  <div className="flex items-start gap-2.5">
                    <User className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{ret.customerName}</p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{ret.customerEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Return reason column */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Reason for Return</h4>
                  <p className="font-extrabold text-orange-600 dark:text-orange-400">
                    {formatReason(ret.reason)}
                  </p>
                  {ret.description && (
                    <p className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/40 italic leading-relaxed">
                      "{ret.description}"
                    </p>
                  )}
                </div>

                {/* Items column */}
                <div className="space-y-3 md:col-span-1">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Items Returned</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {ret.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        <span className="truncate">
                          {item.productName} {item.variantName && `(${item.variantName})`}
                        </span>
                        <span className="shrink-0 font-extrabold text-zinc-800 dark:text-zinc-200">
                          Qty: {item.quantity} • ₹{parseFloat(item.price) * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MANAGE MODAL */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReturn(null)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-100 dark:border-zinc-850">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Review Return Request</h3>
              <button 
                onClick={() => setSelectedReturn(null)} 
                className="text-zinc-400 hover:text-zinc-600 text-xs font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-5 space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex gap-2 text-[11px] text-zinc-500 font-semibold leading-relaxed">
                <AlertCircle className="h-4.5 w-4.5 text-orange-500 shrink-0" />
                <div>
                  <p>Current status is: <strong className="text-zinc-800 uppercase">{selectedReturn.status}</strong></p>
                  <p className="mt-1">Advancing return to <strong className="text-emerald-600 uppercase">COMPLETED</strong> will automatically calculate order item returns and trigger database refund generation.</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Set Return Status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-700 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
                >
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approve Return Request</option>
                  <option value="rejected">Reject Return Request</option>
                  <option value="pickup_scheduled">Schedule Pickup</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="received">Received at Warehouse</option>
                  <option value="inspected">Inspected & Verified</option>
                  <option value="completed">Complete Return & Process Refund</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Review Notes / Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="E.g. Return approved, product damaged in transit. Refund issued."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 text-xs bg-zinc-50 border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="flex-1 h-11 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 text-zinc-505 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dialogLoading}
                  className="flex-1 h-11 bg-orange-500 hover:bg-orange-660 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {dialogLoading ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <>Update Status</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
