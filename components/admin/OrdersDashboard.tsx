'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Search, 
  MapPin, 
  Calendar, 
  Phone, 
  DollarSign, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  Check,
  X,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  finalPrice: string;
  product: {
    name: string;
  };
  variant: {
    name: string;
  } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  totalAmount: string;
  recipientName: string;
  recipientMobile: string;
  deliveryDate: string | null;
  deliveryInstructions: string | null;
  shippingAddress?: {
    houseFlat: string;
    building: string | null;
    street: string;
    area: string | null;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  items: OrderItem[];
}

interface OrdersDashboardProps {
  initialOrders: Order[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  initialSearch: string;
  initialStatus: string;
}

export default function OrdersDashboard({ 
  initialOrders,
  currentPage,
  totalPages,
  totalCount,
  initialSearch,
  initialStatus
}: OrdersDashboardProps) {
  const router = useRouter();
  const [ordersList, setOrdersList] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  // Sound generator using Web Audio API to notify managers of new orders
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by gesture');
    }
  };

  // Background polling to fetch latest orders
  useEffect(() => {
    const pollOrders = async () => {
      if (isPolling) return;
      setIsPolling(true);
      try {
        const res = await fetch('/api/admin/orders?limit=50');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            // Check for new pending orders
            const currentPendingIds = ordersList.filter(o => o.status === 'pending').map(o => o.id);
            const incomingPending = json.data.filter((o: any) => o.status === 'pending' && !currentPendingIds.includes(o.id));
            
            if (incomingPending.length > 0) {
              playNotificationSound();
              setNewOrdersCount(prev => prev + incomingPending.length);
            }

            // Merge orders
            setOrdersList(prev => {
              const existingMap = new Map(prev.map(item => [item.id, item]));
              json.data.forEach((o: any) => {
                existingMap.set(o.id, o);
              });
              return Array.from(existingMap.values()).sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          }
        }
      } catch (err) {
        console.error('Error polling latest orders:', err);
      } finally {
        setIsPolling(false);
      }
    };

    const interval = setInterval(pollOrders, 12000); // Poll every 12 seconds
    return () => clearInterval(interval);
  }, [ordersList, isPolling]);

  // Handle order status updates (e.g. Accept / Cancel / Progress)
  const handleUpdateStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setUpdatingId(orderId);

    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, notes }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setOrdersList(prev =>
          prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        router.refresh();
      } else {
        alert(json.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Network error. Failed to update order.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 animate-pulse';
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'preparing':
      case 'ready_for_dispatch':
      case 'out_for_delivery':
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'delivered':
        return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700';
      case 'cancelled':
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  const handlePageChange = (page: number) => {
    router.push(`?q=${encodeURIComponent(searchQuery)}&status=${statusFilter}&page=${page}`);
  };

  // Client-Side Dynamic filtering for lightning-fast search & tab performance
  const filteredOrders = useMemo(() => {
    return ordersList.filter(order => {
      // 1. Text filter
      const matchesText = searchQuery.trim() === '' || 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.recipientMobile.includes(searchQuery);

      // 2. Status tab filter
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [ordersList, searchQuery, statusFilter]);

  // Count active pending orders to display in the header badge
  const pendingOrdersCount = useMemo(() => {
    return ordersList.filter(o => o.status === 'pending').length;
  }, [ordersList]);

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
              <ShoppingBag className="h-6 w-6 text-emerald-550" />
              Order Management
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Validate incoming orders, inspect line items, and track delivery updates in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isPolling && (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Syncing...
              </span>
            )}
            {newOrdersCount > 0 && (
              <button 
                onClick={() => {
                  setNewOrdersCount(0);
                  playNotificationSound();
                }}
                className="flex items-center gap-1 text-[10px] font-black text-white bg-rose-500 px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-rose-600 active:scale-95 transition-all cursor-pointer shadow-sm animate-bounce"
              >
                🔔 {newOrdersCount} New Orders received
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Status Tabs Filter for instant performance */}
        <div className="flex flex-wrap gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending Approval', badge: pendingOrdersCount, badgeColor: 'bg-amber-500 text-white font-black' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'preparing', label: 'Preparing' },
            { id: 'ready_for_dispatch', label: 'Ready for Dispatch' },
            { id: 'out_for_delivery', label: 'Out for Delivery' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-800'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-400'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${tab.badgeColor || 'bg-zinc-200 text-zinc-700'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Fast Client Filter Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Instant Search by order number, recipient name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-xs font-semibold outline-none transition-all focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Orders Table/List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-medium font-sans">
              No orders found matching criteria.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="p-4 pl-6">Order ID</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Progress Actions</th>
                      <th className="p-4 pr-6 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-xs font-semibold text-zinc-750 dark:text-zinc-300">
                    {filteredOrders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      const isUpdating = updatingId === order.id;

                      return (
                        <React.Fragment key={order.id}>
                          <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                            <td className="p-4 pl-6 font-bold text-zinc-900 dark:text-zinc-50">
                              {order.orderNumber}
                            </td>
                            <td className="p-4">
                              <span className="font-bold block">{order.recipientName}</span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">{order.recipientMobile}</span>
                            </td>
                            <td className="p-4 text-zinc-550 dark:text-zinc-450">{formatDate(order.createdAt)}</td>
                            <td className="p-4 font-black text-zinc-900 dark:text-zinc-50">₹{order.totalAmount}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {order.status === 'pending' ? (
                                // Pulsing prominent Accept & Reject Action Buttons for Store Manager verification
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateStatus(order.id, 'confirmed', 'Order accepted and confirmed by store manager.')}
                                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" /> Accept
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => {
                                      if (confirm('Decline and cancel order ' + order.orderNumber + '?')) {
                                        handleUpdateStatus(order.id, 'cancelled', 'Order declined/cancelled by store manager.');
                                      }
                                    }}
                                    className="flex items-center gap-1 bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                                  >
                                    <X className="h-3 w-3" /> Decline
                                  </button>
                                </div>
                              ) : (
                                // Standard Dropdown for other status advancements
                                <select
                                  disabled={isUpdating}
                                  value={order.status}
                                  onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                  className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[10px] font-bold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="preparing">Preparing</option>
                                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                                  <option value="out_for_delivery">Out for Delivery</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              )}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => toggleExpand(order.id)}
                                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-750 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expandable Order Details Panel */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="px-5 pb-5 pt-1 border-t border-zinc-50 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-950/10 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-655 dark:text-zinc-450">
                                    
                                    {/* Shipping Address */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wide flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        Shipping Address
                                      </span>
                                      {order.shippingAddress ? (
                                        <p className="font-semibold leading-relaxed">
                                          {order.shippingAddress.houseFlat}, {order.shippingAddress.building && `${order.shippingAddress.building}, `}{order.shippingAddress.street}, {order.shippingAddress.area && `${order.shippingAddress.area}, `}<br />
                                          {order.shippingAddress.landmark && `Landmark: ${order.shippingAddress.landmark}, `}
                                          {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                                        </p>
                                      ) : (
                                        <p className="italic text-zinc-400">No delivery address specified.</p>
                                      )}
                                    </div>

                                    {/* Delivery Info */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wide flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Delivery Schedule
                                      </span>
                                      <p className="font-semibold leading-relaxed">
                                        Date: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'Standard Delivery'}<br />
                                        Instructions: {order.deliveryInstructions || 'None'}
                                      </p>
                                    </div>

                                    {/* Payment details */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wide flex items-center gap-1">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        Payment Method
                                      </span>
                                      <p className="font-semibold leading-relaxed">
                                        Method: <span className="uppercase">{order.paymentMethod}</span><br />
                                        State: <span className="capitalize font-bold text-zinc-900 dark:text-zinc-50">{order.paymentStatus}</span>
                                      </p>
                                    </div>

                                  </div>

                                  {/* Line items details */}
                                  <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide block">Order Line Items</span>
                                    <div className="space-y-1.5">
                                      {order.items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                                          <div>
                                            <span>{item.product.name}</span>
                                            {item.variant && (
                                              <span className="text-[10px] text-zinc-400 font-semibold ml-1.5">({item.variant.name})</span>
                                            )}
                                          </div>
                                          <span className="text-zinc-450 font-semibold">
                                            ₹{item.finalPrice} <span className="text-[10px] font-black ml-1 text-emerald-600">x{item.quantity}</span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-400">
                  <span>
                    Showing Page {currentPage} of {totalPages} ({totalCount} total orders)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="h-8 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-550 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300 transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`h-8 w-8 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'border-zinc-200 text-zinc-550 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="h-8 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-550 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300 transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
