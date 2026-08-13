'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  User, 
  Clipboard, 
  Key, 
  Clock, 
  Plus, 
  Loader2,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  recipientName: string;
  status: string;
}

interface Driver {
  id: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  status: string;
}

interface Delivery {
  id: string;
  deliveryNumber: string;
  status: string;
  otpCode: string | null;
  createdAt: string;
  orderNumber: string;
  recipientName: string;
  driverName: string;
  vehicleNumber: string;
}

interface DeliveriesManagerProps {
  activeOrders: Order[];
  activeDrivers: Driver[];
  activeDeliveries: Delivery[];
}

export default function DeliveriesManager({
  activeOrders,
  activeDrivers,
  activeDeliveries
}: DeliveriesManagerProps) {
  const router = useRouter();
  
  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedDriverId) {
      alert('Please select both an order and a driver.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/deliveries/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: selectedOrderId, 
          driverId: selectedDriverId 
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Driver assigned successfully! Delivery Number: ${json.data.deliveryNumber}. OTP Code: ${json.data.deliveryOtp}`);
        setSelectedOrderId('');
        setSelectedDriverId('');
        router.refresh();
        window.location.reload();
      } else {
        alert(json.message || 'Failed to assign driver');
      }
    } catch (err) {
      console.error('Error assigning driver:', err);
      alert('Network error. Failed to assign driver.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
      case 'picked_up':
      case 'out_for_delivery':
        return 'bg-amber-50 text-amber-750 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default:
        return 'bg-zinc-50 text-zinc-650 border-zinc-100';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="space-y-8">
        
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
              <Truck className="h-6 w-6 text-emerald-500" />
              Delivery Dispatch Control
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Assign logistics drivers, dispatch active pending warehouse inventory, and review security OTPs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SECTION 1: DISPATCH ASSIGNMENT FORM */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm h-fit space-y-5">
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-emerald-500" />
                New Delivery Dispatch
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">
                Pair a package-ready order with an active online driver.
              </p>
            </div>

            <form onSubmit={handleAssign} className="space-y-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Select Ready Order</label>
                {activeOrders.length === 0 ? (
                  <div className="text-xs text-zinc-400 italic py-2">
                    No orders are currently waiting for driver assignment.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  >
                    <option value="">-- Choose Order --</option>
                    {activeOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} ({o.recipientName} - {o.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Assign Driver</label>
                {activeDrivers.length === 0 ? (
                  <div className="text-xs text-zinc-400 italic py-2">
                    No drivers are currently active or online.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  >
                    <option value="">-- Choose Driver --</option>
                    {activeDrivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.driverName} ({d.vehicleType}: {d.vehicleNumber})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || activeOrders.length === 0 || activeDrivers.length === 0}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  'Assign & Dispatch Order'
                )}
              </button>

            </form>
          </div>

          {/* SECTION 2: ACTIVE DELIVERIES LOG */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Active Delivery Runs</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">
                Tracks driver assignments, live delivery statuses, and OTP confirmation tokens.
              </p>
            </div>

            {activeDeliveries.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-550 font-medium font-sans">
                No active delivery runs recorded today.
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="p-4 pl-6">Run Details</th>
                      <th className="p-4">Customer Package</th>
                      <th className="p-4">Driver Staff</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-center">OTP Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {activeDeliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                        <td className="p-4 pl-6">
                          <span className="font-bold text-zinc-900 dark:text-zinc-50 block">
                            {del.deliveryNumber}
                          </span>
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDate(del.createdAt)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold block">{del.orderNumber}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{del.recipientName}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold block">{del.driverName}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{del.vehicleNumber}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusColor(del.status)}`}>
                            {del.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-center font-mono font-black text-zinc-900 dark:text-zinc-50">
                          {del.otpCode || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
