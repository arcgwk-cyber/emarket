'use client';

import React from 'react';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle, 
  ChefHat, 
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface OrderHistory {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  product: { name: string };
  variant: { name: string } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryDate: string;
  deliveryInstructions: string | null;
  totalAmount: string;
  recipientName: string;
  recipientMobile: string;
  paymentMethod: string;
  paymentStatus: string;
  history: OrderHistory[];
  items: any[];
  shippingAddress: {
    houseFlat: string;
    street: string;
    city: string;
    pincode: string;
  };
  deliverySlot: {
    startTime: string;
    endTime: string;
  };
}

interface OrderTrackerProps {
  order: Order;
}

export default function OrderTracker({ order }: OrderTrackerProps) {
  // Stepper mapping
  const steps = [
    { label: 'Order Placed', statusKey: 'confirmed', icon: FileText },
    { label: 'Preparing', statusKey: 'preparing', icon: ChefHat },
    { label: 'Out for Delivery', statusKey: 'out_for_delivery', icon: Truck },
    { label: 'Delivered', statusKey: 'delivered', icon: CheckCircle },
  ];

  // Helper to determine step states
  const getStepState = (stepIndex: number) => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready_for_dispatch', 'out_for_delivery', 'delivered'];
    const currentStatusIdx = statusOrder.indexOf(order.status);
    
    // Map current dynamic sub-statuses to core visual steps
    let targetIdx = 0;
    if (order.status === 'confirmed') targetIdx = 0;
    else if (order.status === 'preparing') targetIdx = 1;
    else if (order.status === 'ready_for_dispatch' || order.status === 'out_for_delivery') targetIdx = 2;
    else if (order.status === 'delivered') targetIdx = 3;

    if (order.status === 'cancelled') {
      return 'cancelled';
    }

    if (stepIndex < targetIdx) return 'completed';
    if (stepIndex === targetIdx) return 'active';
    return 'upcoming';
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded tracking-wide">
            Live Tracking
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
            Order #{order.orderNumber}
          </h1>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-zinc-500">Estimated Delivery Date</p>
          <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-0.5">
            {order.deliveryDate} ({order.deliverySlot.startTime.slice(0, 5)} - {order.deliverySlot.endTime.slice(0, 5)})
          </p>
        </div>
      </div>

      {order.status === 'cancelled' && (
        <div className="mt-8 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2 dark:bg-rose-950/20 dark:border-rose-900/30">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Order Cancelled</h4>
            <p className="mt-0.5 text-rose-500 font-medium">This order was cancelled and any payment will be refunded shortly.</p>
          </div>
        </div>
      )}

      {/* 2. STEPPER PROGRESS BAR */}
      {order.status !== 'cancelled' && (
        <div className="mt-10 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-850 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8 sm:gap-4 relative">
            
            {/* Desktop progress connector line */}
            <div className="hidden sm:block absolute top-[22px] left-[10%] right-[10%] h-0.5 bg-zinc-100 dark:bg-zinc-800 z-0" />

            {steps.map((step, idx) => {
              const state = getStepState(idx);
              const Icon = step.icon;

              return (
                <div key={idx} className="flex sm:flex-col items-center gap-4 sm:gap-2 z-10 w-full sm:w-auto relative">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${
                    state === 'completed'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : state === 'active'
                      ? 'border-emerald-500 bg-white text-emerald-500 dark:bg-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col sm:items-center text-left sm:text-center">
                    <span className={`text-xs font-extrabold ${
                      state === 'active' || state === 'completed' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SPLIT SECTIONS: TIMELINE VS DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 items-start">
        
        {/* LEFT/MID COLUMN: STATUS TIMELINE LOGS */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider pb-3 border-b border-zinc-100 dark:border-zinc-800">
            Timeline Activity
          </h3>

          <div className="flex flex-col gap-6 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 mt-2">
            {order.history.map((h, idx) => (
              <div key={h.id} className="relative flex flex-col gap-1 pr-4">
                {/* timeline indicator circle overlay */}
                <div className={`absolute -left-[23px] top-[4px] h-3 w-3 rounded-full border-2 ${
                  idx === 0 
                    ? 'bg-emerald-500 border-emerald-500 ring-4 ring-emerald-500/20' 
                    : 'bg-zinc-300 border-white dark:border-zinc-900'
                }`} />
                
                <span className="text-[10px] text-zinc-400 font-semibold">
                  {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(h.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs font-extrabold text-zinc-850 dark:text-zinc-200 uppercase tracking-wide">
                  {h.status}
                </span>
                {h.notes && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal font-medium">
                    {h.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY DETAILS */}
        <div className="flex flex-col gap-6">
          
          {/* Shipping Address summary */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
              Shipping Destination
            </h4>
            <div className="flex gap-2 items-start text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <MapPin className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 font-medium">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{order.recipientName}</span>
                <span>{order.recipientMobile}</span>
                <p className="mt-1 leading-normal">
                  {order.shippingAddress.houseFlat}, {order.shippingAddress.street}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
                </p>
                {order.deliveryInstructions && (
                  <span className="text-[10px] italic text-zinc-400 mt-2 block">
                    "{order.deliveryInstructions}"
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Items Summary card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
              Bill Details
            </h4>
            <div className="flex flex-col gap-3.5 border-b border-zinc-50 dark:border-zinc-800 pb-4 max-h-36 overflow-y-auto no-scrollbar">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <span className="truncate max-w-[140px]">
                    {item.variant ? `${item.product.name} (${item.variant.name})` : item.product.name}
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold shrink-0">
                    {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between text-zinc-500 font-semibold">
                <span>Payment Mode:</span>
                <span className="text-zinc-900 dark:text-zinc-100 uppercase font-extrabold">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-semibold">
                <span>Payment Status:</span>
                <span className="text-zinc-900 dark:text-zinc-100 uppercase font-bold">{order.paymentStatus}</span>
              </div>
              <div className="flex justify-between text-zinc-900 dark:text-zinc-100 font-black border-t border-zinc-50 dark:border-zinc-800 pt-3 text-sm">
                <span>Total Amount:</span>
                <span className="text-emerald-500 font-extrabold text-base">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
