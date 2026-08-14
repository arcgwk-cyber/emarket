'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  Search, 
  MapPin, 
  Calendar, 
  Truck, 
  Loader2, 
  QrCode, 
  AlertCircle, 
  Clock, 
  ChevronLeft,
  Sparkles,
  Barcode
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  quantity: number;
  productName: string;
  variantName: string | null;
  image: string;
  weight: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  recipientName: string;
  recipientMobile: string;
  createdAt: string;
  totalAmount: string;
  deliverySlotName: string;
  driverName: string;
  vehicleNumber: string;
  items: OrderItem[];
}

interface FulfillmentHubProps {
  initialOrders: Order[];
}

export default function FulfillmentHub({ initialOrders }: FulfillmentHubProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrders.length > 0 ? initialOrders[0].id : null
  );

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [activeQueueTab, setActiveQueueTab] = useState<'pack' | 'dispatch'>('pack');

  // Item Verification Packing checklist state
  // Map of orderItem.id -> Boolean (whether verified)
  const [verifiedItems, setVerifiedItems] = useState<Record<string, boolean>>({});
  const [scanningItemId, setScanningItemId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Get current active selected order details
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Extract unique delivery slots from orders list for filter
  const timeSlots = useMemo(() => {
    const slots = new Set<string>();
    orders.forEach(o => {
      if (o.deliverySlotName) slots.add(o.deliverySlotName);
    });
    return Array.from(slots);
  }, [orders]);

  // Extract unique drivers from orders list for filter
  const drivers = useMemo(() => {
    const drvs = new Set<string>();
    orders.forEach(o => {
      if (o.driverName) drvs.add(o.driverName);
    });
    return Array.from(drvs);
  }, [orders]);

  // Handle status transitions (e.g. ready_for_dispatch, out_for_delivery)
  const handleUpdateStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setSubmittingId(orderId);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, notes }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Update local status state
        setOrders(prev => 
          prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        // Clear checklist items
        setVerifiedItems({});
        // Move to next order if any
        const remaining = orders.filter(o => o.id !== orderId);
        if (remaining.length > 0) {
          setSelectedOrderId(remaining[0].id);
        } else {
          setSelectedOrderId(null);
        }
        router.refresh();
      } else {
        alert(json.message || 'Failed to update order status');
      }
    } catch (e) {
      alert('Network error. Failed to update status.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Simulate AI Scanner Barcode verification for packing (Zero-Error proofing)
  const simulateScanner = (itemId: string) => {
    setScanningItemId(itemId);
    // Play synthetic beep sound
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {}

    setTimeout(() => {
      setVerifiedItems(prev => ({
        ...prev,
        [itemId]: true
      }));
      setScanningItemId(null);
    }, 400);
  };

  // Check if all items in selected order are packed
  const isOrderFullyPacked = useMemo(() => {
    if (!selectedOrder) return false;
    return selectedOrder.items.every(item => verifiedItems[item.id]);
  }, [selectedOrder, verifiedItems]);

  const itemsPackedCount = useMemo(() => {
    if (!selectedOrder) return 0;
    return selectedOrder.items.filter(item => verifiedItems[item.id]).length;
  }, [selectedOrder, verifiedItems]);

  // Filters calculation
  const filteredOrdersList = useMemo(() => {
    return orders.filter(o => {
      // Tab filters
      const matchesTab = activeQueueTab === 'pack' 
        ? (o.status === 'confirmed' || o.status === 'preparing')
        : o.status === 'ready_for_dispatch';

      // Text filter
      const matchesSearch = searchQuery.trim() === '' || 
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.recipientName.toLowerCase().includes(searchQuery.toLowerCase());

      // Slot filter
      const matchesSlot = selectedSlot === 'all' || o.deliverySlotName === selectedSlot;

      // Driver filter
      const matchesDriver = selectedDriver === 'all' || o.driverName === selectedDriver;

      return matchesTab && matchesSearch && matchesSlot && matchesDriver;
    });
  }, [orders, activeQueueTab, searchQuery, selectedSlot, selectedDriver]);

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
              <QrCode className="h-6 w-6 text-emerald-550" />
              Paperless Fulfillment Center
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> AI-Assisted packing checklists, zero-error item barcode verifications, and delivery batch logs.
            </p>
          </div>
        </div>

        {/* Dashboard Queue Tabs */}
        <div className="flex gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveQueueTab('pack');
              setVerifiedItems({});
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
              activeQueueTab === 'pack'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 dark:text-zinc-400'
            }`}
          >
            📦 Pick & Pack Queue ({orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveQueueTab('dispatch');
              setVerifiedItems({});
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
              activeQueueTab === 'dispatch'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 dark:text-zinc-400'
            }`}
          >
            🚚 Dispatch & Handover Queue ({orders.filter(o => o.status === 'ready_for_dispatch').length})
          </button>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-50/55 dark:bg-zinc-950/20 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800">
          <div className="relative col-span-2">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by order ID or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            />
          </div>

          <div>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            >
              <option value="all">All Delivery Slots</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            >
              <option value="all">All Assigned Drivers</option>
              {drivers.map(driver => (
                <option key={driver} value={driver}>{driver}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Layout Grid: Left list, Right verification checklist details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT LIST: Orders queue */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-4 rounded-3xl space-y-3 max-h-[600px] overflow-y-auto">
            <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2 px-1">Orders List</h3>
            {filteredOrdersList.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-12">No orders in this queue.</p>
            ) : (
              filteredOrdersList.map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setVerifiedItems({});
                  }}
                  className={`w-full p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                    selectedOrderId === order.id
                      ? 'border-emerald-500 bg-emerald-50/5 border-2 shadow-sm'
                      : 'border-zinc-100 hover:bg-zinc-50 dark:border-zinc-850 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{order.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="text-[11px] font-bold text-zinc-500 space-y-1">
                    <p className="text-zinc-700 dark:text-zinc-300 font-extrabold">{order.recipientName}</p>
                    <p className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" /> {order.deliverySlotName}</p>
                    <p className="flex items-center gap-1"><Truck className="h-3 w-3 shrink-0 text-emerald-500" /> Driver: {order.driverName}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* RIGHT VIEW: Verification and checklist packing */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm min-h-[480px]">
            {selectedOrder ? (
              <div className="space-y-6">
                
                {/* Order metadata banner */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50 leading-snug">{selectedOrder.orderNumber}</h2>
                    <p className="text-xs font-semibold text-zinc-450 mt-0.5">
                      Customer: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{selectedOrder.recipientName}</span> • Mob: {selectedOrder.recipientMobile}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Schedule</p>
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-4 w-4 text-emerald-500" /> {selectedOrder.deliverySlotName}
                    </p>
                  </div>
                </div>

                {/* PACK QUEUE PACKING CHECKLIST OR DISPATCH HANDOVER CONTROLS */}
                {activeQueueTab === 'pack' ? (
                  <div className="space-y-6">
                    {/* Progress tracking */}
                    <div className="space-y-1.5 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <div className="flex justify-between text-xs font-bold text-zinc-550">
                        <span>Fulfillment Packing Progress</span>
                        <span className={isOrderFullyPacked ? 'text-emerald-500 font-black' : 'text-zinc-500'}>
                          {itemsPackedCount} / {selectedOrder.items.length} items packed
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(itemsPackedCount / selectedOrder.items.length) * 100}%` }}
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        />
                      </div>
                      {isOrderFullyPacked && (
                        <p className="text-[10px] text-emerald-500 font-black flex items-center gap-1 pt-1.5 animate-pulse">
                          <Check className="h-3.5 w-3.5" /> All items verified via Barcode scanning! Order safe to dispatch.
                        </p>
                      )}
                    </div>

                    {/* Checklist items mapping */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide block">Verification Checklist</span>
                      {selectedOrder.items.map(item => {
                        const isVerified = !!verifiedItems[item.id];
                        const isScanning = scanningItemId === item.id;
                        return (
                          <div 
                            key={item.id} 
                            className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all ${
                              isVerified 
                                ? 'border-emerald-250 bg-emerald-50/5 dark:border-emerald-950/20' 
                                : 'border-zinc-100 dark:border-zinc-850'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={item.image} 
                                alt={item.productName} 
                                className="h-12 w-12 rounded-xl object-cover shrink-0" 
                              />
                              <div className="text-xs">
                                <p className="font-extrabold text-zinc-850 dark:text-zinc-150">{item.productName}</p>
                                <p className="text-zinc-400 font-semibold mt-0.5">
                                  Size: {item.weight} • <span className="text-emerald-500 font-black">Qty: {item.quantity}</span>
                                </p>
                              </div>
                            </div>

                            {/* Scan trigger button (Anti-Error scanning simulation) */}
                            <button
                              type="button"
                              disabled={isVerified}
                              onClick={() => simulateScanner(item.id)}
                              className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                isVerified
                                  ? 'bg-emerald-50 text-emerald-550 border border-emerald-200/50 cursor-default'
                                  : isScanning
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 animate-pulse'
                                  : 'bg-zinc-900 text-white hover:bg-emerald-500 active:scale-95 shadow-sm'
                              }`}
                            >
                              {isVerified ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Packed
                                </>
                              ) : isScanning ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning
                                </>
                              ) : (
                                <>
                                  <Barcode className="h-4 w-4" /> Scan Pack
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dispatch Lock trigger */}
                    <button
                      type="button"
                      disabled={!isOrderFullyPacked || !!submittingId}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'ready_for_dispatch', 'Order packed and verified via digital checklist.')}
                      className={`w-full py-4 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all ${
                        isOrderFullyPacked && !submittingId
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-95'
                          : 'bg-zinc-150 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      {submittingId === selectedOrder.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Ready for Dispatch (Secure Lock)'
                      )}
                    </button>
                  </div>
                ) : (
                  // DISPATCH HANDOVER Tab
                  <div className="space-y-6">
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col gap-3 bg-zinc-50/20">
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Logistics Driver Handoff</h4>
                      <div className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 space-y-2">
                        <p>Assigned Driver: <span className="text-zinc-900 dark:text-zinc-50 font-black">{selectedOrder.driverName}</span></p>
                        <p>Vehicle Number: <span className="text-zinc-900 dark:text-zinc-50 font-bold">{selectedOrder.vehicleNumber}</span></p>
                      </div>
                      
                      {selectedOrder.driverName === 'Not Assigned Yet' && (
                        <div className="flex items-start gap-1.5 p-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                          Cannot complete handover. Assign a driver in the "Delivery Dispatch Control" panel before dispatching.
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={selectedOrder.driverName === 'Not Assigned Yet' || !!submittingId}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery', 'Order handed over to driver.')}
                      className={`w-full py-4 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all ${
                        selectedOrder.driverName !== 'Not Assigned Yet' && !submittingId
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-95'
                          : 'bg-zinc-150 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      {submittingId === selectedOrder.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Handover to Driver (Dispatch Now)'
                      )}
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-12 min-h-[300px]">
                <QrCode className="h-12 w-12 text-zinc-300 mb-3" />
                <p className="text-xs font-semibold text-zinc-400">Select an order from the queue to start packing verification.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
