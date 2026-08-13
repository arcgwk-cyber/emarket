'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  CreditCard, 
  ArrowRight, 
  FileText, 
  RefreshCw,
  Loader2,
  Check
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  finalPrice: string;
  product: {
    id: string;
    name: string;
  } | null;
  variant: {
    id: string;
    name: string;
  } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string | Date;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  formatStatus: (status: string) => string;
  getStatusBadge: (status: string) => string;
  formatDate: (date: Date | string) => string;
}

export default function OrderCard({ 
  order, 
  formatStatus, 
  getStatusBadge, 
  formatDate 
}: OrderCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('damaged_product');
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; qty: number }>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeTracking = [
    'pending', 
    'confirmed', 
    'preparing', 
    'ready_for_dispatch', 
    'out_for_delivery'
  ].includes(order.status);

  const canReturn = order.status === 'delivered';
  const returnRequested = ['return_requested', 'return_approved', 'returned'].includes(order.status);

  // Initialize selected items state
  const openReturnModal = () => {
    const init: Record<string, { selected: boolean; qty: number }> = {};
    order.items.forEach(item => {
      init[item.id] = { selected: true, qty: item.quantity };
    });
    setSelectedItems(init);
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected }
    }));
  };

  const handleQtyChange = (itemId: string, maxQty: number, val: number) => {
    const cleanVal = Math.max(1, Math.min(maxQty, val));
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], qty: cleanVal }
    }));
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, data]) => data.selected)
      .map(([itemId, data]) => ({
        orderItemId: itemId,
        quantity: data.qty
      }));

    if (itemsToReturn.length === 0) {
      setErrorMsg('Please select at least one item to return');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          reason,
          description,
          items: itemsToReturn
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Return request submitted successfully!');
        setTimeout(() => {
          setIsModalOpen(false);
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(json.message || 'Failed to submit return request');
      }
    } catch (err) {
      setErrorMsg('Error submitting request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-4 font-sans">
      {/* Order Top Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-50 dark:border-zinc-800">
        <div>
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">
            Order Number
          </span>
          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 mt-0.5">
            {order.orderNumber}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadge(order.status)}`}>
            {formatStatus(order.status)}
          </span>
        </div>
      </div>

      {/* Order Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2 text-zinc-500">
          <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
          <span>{formatDate(order.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 justify-end">
          <CreditCard className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="capitalize">{order.paymentMethod} • {order.paymentStatus}</span>
        </div>
      </div>

      {/* Order Items List */}
      <div className="space-y-2 py-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 py-1 text-xs">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-700 dark:text-zinc-300 truncate">
                {item.product?.name}
                {item.variant && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-505 font-medium ml-1.5">
                    ({item.variant.name})
                  </span>
                )}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Qty: {item.quantity} • ₹{item.price} each
              </p>
            </div>
            <span className="font-black text-zinc-800 dark:text-zinc-200 shrink-0">
              ₹{item.finalPrice}
            </span>
          </div>
        ))}
      </div>

      {/* Totals & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-50 dark:border-zinc-800">
        <div>
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wide">
            Total Paid
          </span>
          <p className="text-sm font-black text-zinc-950 dark:text-zinc-50 leading-none mt-1">
            ₹{order.totalAmount}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Invoice trigger (always show once order is confirmed/paid/delivered) */}
          {order.status !== 'pending' && order.status !== 'cancelled' && (
            <Link
              href={`/account/orders/invoice/${order.id}`}
              className="rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-850 dark:hover:bg-zinc-800 px-3.5 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800"
            >
              <FileText className="h-3.5 w-3.5" />
              Invoice
            </Link>
          )}

          {activeTracking ? (
            <Link
              href={`/tracking/${order.id}`}
              className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1"
            >
              Track Order
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : canReturn ? (
            <button
              onClick={openReturnModal}
              className="rounded-xl bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Return Items
            </button>
          ) : returnRequested ? (
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1 uppercase tracking-wider">
              Return Logged
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-zinc-400">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* RETURN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-100 dark:border-zinc-850">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Log Order Return Request</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 text-xs font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-605 rounded-lg">
                  ⚠ {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              {/* Items Select List */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Select items to return</label>
                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                  {order.items.map((item) => {
                    const selectState = selectedItems[item.id] || { selected: false, qty: 1 };
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                          selectState.selected 
                            ? 'border-emerald-250 bg-emerald-50/20' 
                            : 'border-zinc-100 bg-zinc-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectState.selected}
                            onChange={() => handleItemToggle(item.id)}
                            className="rounded text-emerald-650 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate max-w-[180px]">
                              {item.product?.name}
                            </p>
                            <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">
                              {item.variant?.name || '1 Pack'}
                            </p>
                          </div>
                        </div>

                        {selectState.selected && (
                          <div className="flex items-center gap-1.5 bg-white rounded-lg border border-zinc-100 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, item.quantity, selectState.qty - 1)}
                              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-500"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-[10px] font-black text-zinc-800">
                              {selectState.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, item.quantity, selectState.qty + 1)}
                              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-500"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-700 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
                >
                  <option value="damaged_product">Damaged / Leaked Product</option>
                  <option value="quality_issue">Quality is Unsatisfactory</option>
                  <option value="incorrect_item">Incorrect Item / Weight Delivered</option>
                  <option value="expired_item">Product Expired or Near Expiry</option>
                  <option value="no_longer_needed">No longer needed / Change of mind</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Detail the issue (e.g. Tomato was squashed in transit)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 text-xs bg-zinc-50 border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-orange-500 hover:bg-orange-655 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>Submit Return Request</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
