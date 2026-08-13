'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  User, 
  MapPin, 
  CreditCard,
  Loader2,
  ChevronLeft,
  ShoppingBag
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
  variant?: {
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
}

export default function OrdersDashboard({ initialOrders }: OrdersDashboardProps) {
  const router = useRouter();
  const [ordersList, setOrdersList] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);

    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
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
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'confirmed':
      case 'preparing':
      case 'ready_for_dispatch':
      case 'out_for_delivery':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'delivered':
        return 'bg-zinc-150 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700';
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

  const filteredOrders = ordersList.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipientMobile.includes(searchQuery);
      
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
              <ShoppingBag className="h-6 w-6 text-emerald-555" />
              Order Management
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              View and progress supermarket order statuses, inspect addresses, and track payment states.
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by order number or customer details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            />
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold outline-none transition-all focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready_for_dispatch">Ready for Dispatch</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table/List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-medium font-sans">
              No orders found matching criteria.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isUpdating = updatingId === order.id;

                return (
                  <div key={order.id} className="transition-colors hover:bg-zinc-50/20">
                    
                    {/* Row Summary */}
                    <div 
                      onClick={() => toggleExpand(order.id)}
                      className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
                        )}
                        <div>
                          <span className="font-black text-zinc-900 dark:text-zinc-50 block">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-[140px]">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                          {order.recipientName}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          {order.recipientMobile}
                        </span>
                      </div>

                      <div>
                        <span className="font-black text-zinc-950 dark:text-zinc-50 block">
                          ₹{order.totalAmount}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 capitalize">
                          {order.paymentMethod} • {order.paymentStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[10px] font-bold outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-850 dark:text-zinc-200 cursor-pointer"
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
                      </div>
                    </div>

                    {/* Expandable Order Details Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-zinc-50 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-950/10 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-650 dark:text-zinc-400">
                          
                          {/* Shipping Address */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
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
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Delivery Schedule
                            </span>
                            <p className="font-semibold leading-relaxed">
                              Date: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Immediate dispatch'}<br />
                              Instructions: {order.deliveryInstructions || 'None'}
                            </p>
                          </div>

                          {/* User Account Details */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              Customer Account
                            </span>
                            <p className="font-semibold leading-relaxed">
                              Name: {order.recipientName}<br />
                              Phone: {order.recipientMobile}
                            </p>
                          </div>

                        </div>

                        {/* Order Items Table */}
                        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                                <th className="p-3 pl-4">Product</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 pr-4 text-right">Final Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                              {order.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="p-3 pl-4">
                                    {item.product.name}
                                    {item.variant && (
                                      <span className="text-[10px] text-zinc-400 font-medium ml-1.5">
                                        ({item.variant.name})
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">{item.quantity}</td>
                                  <td className="p-3 text-right">₹{item.price}</td>
                                  <td className="p-3 pr-4 text-right font-bold text-zinc-900 dark:text-zinc-50">
                                    ₹{item.finalPrice}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
