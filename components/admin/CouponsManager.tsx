'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Calendar, 
  Info, 
  DollarSign, 
  Percent,
  Search,
  Loader2
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string | null;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  perCustomerLimit: number;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      const json = await res.json();
      if (json.success) {
        setCoupons(json.data);
      } else {
        setErrorMsg(json.message || 'Failed to fetch coupons');
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to coupon service API');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c));
        setSuccessMsg('Coupon status updated successfully');
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        setErrorMsg(json.message || 'Failed to update status');
      }
    } catch (err) {
      setErrorMsg('Error communicating status update');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this coupon code?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCoupons(prev => prev.filter(c => c.id !== id));
        setSuccessMsg('Coupon deleted successfully');
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        setErrorMsg(json.message || 'Failed to delete coupon');
      }
    } catch (err) {
      setErrorMsg('Error deleting coupon');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue),
          minOrderAmount: parseFloat(minOrderAmount || '0'),
          maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
          startDate,
          endDate,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
          perCustomerLimit: parseInt(perCustomerLimit || '1'),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCoupons(prev => [json.data, ...prev]);
        setSuccessMsg('Promo coupon created successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        setIsModalOpen(false);
        // Clear fields
        setCode('');
        setDiscountValue('');
        setMinOrderAmount('0');
        setMaxDiscountAmount('');
        setStartDate('');
        setEndDate('');
        setUsageLimit('');
        setPerCustomerLimit('1');
      } else {
        setErrorMsg(json.message || 'Failed to create coupon');
      }
    } catch (err) {
      setErrorMsg('Internal error creating coupon');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
            Coupons & Discounts Manager
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure promotional promo codes, percentages, and order limits for checkout conversions.
          </p>
        </div>
        <button
          onClick={() => setIsOpenModalWithDefaults()}
          className="rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-5 py-3 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Promo Coupon
        </button>
      </div>

      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-3.5 text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-600 rounded-xl dark:bg-rose-950/20 dark:border-rose-900/30">
          ⚠ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-900/30">
          ✓ {successMsg}
        </div>
      )}

      {/* Search Filter Bar */}
      <div className="relative max-w-md w-full">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 pointer-events-none">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder="Search by Coupon Code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 text-xs bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-zinc-700 dark:text-zinc-300"
        />
      </div>

      {/* Coupon List Container */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center p-8 bg-zinc-50/50 dark:bg-zinc-950/5">
          <Tag className="h-10 w-10 text-zinc-300 dark:text-zinc-650" />
          <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-300 mt-4">No Coupons Configured</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            Setup discounts to drive checkout sales. Click the creation button above to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((coupon) => {
            const isPercentage = coupon.discountType === 'percentage';
            const isExpired = new Date() > new Date(coupon.endDate);

            return (
              <div 
                key={coupon.id}
                className={`relative flex flex-col justify-between rounded-2xl bg-white dark:bg-zinc-900 border p-5 shadow-sm transition-all ${
                  coupon.isActive && !isExpired
                    ? 'border-zinc-100 dark:border-zinc-800'
                    : 'border-zinc-250 bg-zinc-50/30 dark:border-zinc-800 dark:bg-zinc-950/20 opacity-75'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-2 min-w-0">
                    {/* Code badge */}
                    <span className="self-start text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-650 px-2.5 py-1 rounded-lg dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200/30 shadow-sm">
                      {coupon.code}
                    </span>
                    <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 truncate mt-1">
                      {isPercentage ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Off`}
                    </h3>
                    <p className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-500 leading-snug">
                      Min order: ₹{coupon.minOrderAmount} 
                      {coupon.maxDiscountAmount && ` • Max cap: ₹${coupon.maxDiscountAmount}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                      title={coupon.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                      className="p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors"
                    >
                      {coupon.isActive ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-zinc-350" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      title="Delete Coupon"
                      className="p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-bold text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    <span>
                      Ends {new Date(coupon.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    {isExpired ? (
                      <span className="text-rose-500 font-extrabold">Expired</span>
                    ) : coupon.isActive ? (
                      <span className="text-emerald-600 font-extrabold">Active</span>
                    ) : (
                      <span className="text-zinc-400 font-extrabold">Paused</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up border border-zinc-100 dark:border-zinc-850">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Create New Coupon</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. WELCOME10"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-700 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Discount Value</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-455 pointer-events-none text-xs font-bold">
                      {discountType === 'percentage' ? <Percent className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder={discountType === 'percentage' ? '10' : '100'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full h-10 pl-8 pr-3 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Min Order Subtotal (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="E.g. 299"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Max Cap Amount (₹)</label>
                  <input
                    type="number"
                    disabled={discountType === 'fixed_amount'}
                    placeholder="E.g. 150"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:text-white disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3.5 text-[10px] bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3.5 text-[10px] bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    placeholder="Infinite"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Per User Limit</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full h-11 bg-orange-500 hover:bg-orange-650 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:scale-100"
              >
                {modalLoading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>Create Coupon</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function setIsOpenModalWithDefaults() {
    setIsModalOpen(true);
    setErrorMsg('');

    // Pre-populate some defaults (like 1 month span starting today)
    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const formatDt = (dt: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };

    setStartDate(formatDt(now));
    setEndDate(formatDt(end));
  }
}
