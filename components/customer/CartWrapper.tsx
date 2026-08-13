'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ArrowRight, ShoppingCart, ShoppingBag } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    name: string;
    slug: string;
    mrp: string;
    sellingPrice: string;
    images: string[] | null;
  };
  variant?: {
    name: string;
    mrp: string;
    sellingPrice: string;
  } | null;
}

interface CartWrapperProps {
  initialItems: CartItem[];
  isLoggedIn: boolean;
}

export default function CartWrapper({ initialItems, isLoggedIn }: CartWrapperProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  // Load from localStorage if guest
  useEffect(() => {
    if (!isLoggedIn) {
      const guestCart = localStorage.getItem('guest_cart');
      if (guestCart) {
        try {
          setItems(JSON.parse(guestCart));
        } catch (e) {
          console.error('Failed to parse guest cart');
        }
      }
    }
  }, [isLoggedIn]);

  // Sync back to localStorage if guest
  const saveGuestCart = (newItems: CartItem[]) => {
    localStorage.setItem('guest_cart', JSON.stringify(newItems));
    setItems(newItems);
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;

    if (isLoggedIn) {
      setLoading(true);
      try {
        const item = items.find(i => i.id === itemId);
        if (item) {
          const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: item.productId,
              variantId: item.variantId,
              quantity: newQty,
            }),
          });
          if (res.ok) {
            setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      saveGuestCart(items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await fetch(`/api/cart?id=${itemId}`, { method: 'DELETE' });
        if (res.ok) {
          setItems(items.filter(i => i.id !== itemId));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      saveGuestCart(items.filter(i => i.id !== itemId));
    }
  };

  // Math totals
  const subtotal = items.reduce((acc, item) => {
    const price = item.variant ? parseFloat(item.variant.sellingPrice) : parseFloat(item.product.sellingPrice);
    return acc + price * item.quantity;
  }, 0);

  const deliveryCharge = subtotal > 499 || subtotal === 0 ? 0 : 49;
  const total = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Your Cart is Empty</h2>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
          Looks like you haven't added anything to your cart yet. Explore our fresh categories and start shopping.
        </p>
        <Link
          href="/catalog"
          className="mt-8 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-8 py-3 shadow-md transition-all flex items-center gap-2"
        >
          Go to Shop
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight mb-8">
        Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ITEMS LIST COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => {
            const price = item.variant ? item.variant.sellingPrice : item.product.sellingPrice;
            const mrp = item.variant ? item.variant.mrp : item.product.mrp;
            
            return (
              <div 
                key={item.id}
                className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm"
              >
                {/* Image */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-950 p-1">
                  <Image
                    src={(item.product.images && item.product.images[0]) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60'}
                    alt={item.product.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    <Link href={`/product/${item.product.slug}`} className="hover:text-emerald-500 transition-colors">
                      {item.product.name}
                    </Link>
                  </h3>
                  
                  {item.variant && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded self-start">
                      Option: {item.variant.name}
                    </span>
                  )}
                  
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                      ₹{price}
                    </span>
                    {mrp && mrp !== price && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through">
                        ₹{mrp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity + Actions */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50/50 p-1 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <button
                      disabled={loading || item.quantity <= 1}
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-850 text-zinc-500 disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {item.quantity}
                    </span>
                    <button
                      disabled={loading}
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-850 text-zinc-500 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => handleDeleteItem(item.id)}
                    className="rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 active:scale-95 transition-all dark:border-zinc-800 dark:hover:bg-rose-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY CARD COLUMN */}
        <div className="flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider pb-3 border-b border-zinc-100 dark:border-zinc-800">
            Order Summary
          </h3>

          <div className="flex flex-col gap-3.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Bag Subtotal</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                {deliveryCharge === 0 ? <span className="text-emerald-500">FREE</span> : `₹${deliveryCharge.toFixed(2)}`}
              </span>
            </div>

            {deliveryCharge > 0 && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-normal bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                Add ₹{(499 - subtotal).toFixed(2)} more to unlock **FREE Delivery**!
              </p>
            )}

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 flex justify-between text-sm font-black text-zinc-900 dark:text-zinc-100">
              <span>Order Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black py-4 shadow-md transition-all flex items-center justify-center gap-2"
          >
            Proceed to Checkout
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
