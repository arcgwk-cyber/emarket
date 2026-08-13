'use client';

import React, { useState } from 'react';
import { 
  PackagePlus, 
  Loader2, 
  Check, 
  HelpCircle,
  Tag,
  Hash,
  DollarSign,
  FileText
} from 'lucide-react';

interface Variant {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  variants: Variant[];
}

interface BulkInwardManagerProps {
  productsList: Product[];
}

export default function BulkInwardManager({ productsList }: BulkInwardManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedProduct = productsList.find(p => p.id === selectedProductId);
  const variants = selectedProduct?.variants || [];

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedVariantId(''); // Reset variant when product changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      setErrorMsg('Please select a product and enter a positive quantity');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/inward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          variantId: selectedVariantId || null,
          quantity: parseInt(quantity),
          costPrice: costPrice ? parseFloat(costPrice) : null,
          batchNumber: batchNumber.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Successfully added ${quantity} units of stock. New stock count: ${json.data.newStock}`);
        // Reset fields
        setQuantity('');
        setCostPrice('');
        setBatchNumber('');
        setNotes('');
        setSelectedProductId('');
        setSelectedVariantId('');
      } else {
        setErrorMsg(json.message || 'Failed to record stock inward');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to communicate with inward service API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 font-sans max-w-xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-orange-500" />
          Bulk Stock Inward (GRN)
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Log purchases, inward inventory batches, and update stock counts for delivery operations.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-600 rounded-xl">
          ⚠ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-1.5">
          <Check className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5 text-left">
        {/* Product Select */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3 text-zinc-400" />
            Select Product
          </label>
          <select
            required
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full h-11 px-3 text-xs bg-zinc-50 border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-700 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
          >
            <option value="">-- Choose Product --</option>
            {productsList.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
              Parent Product SKU: {selectedProduct.sku}
            </p>
          )}
        </div>

        {/* Variant Select (Conditional) */}
        {variants.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
              Select Package Option / Weight
            </label>
            <select
              required
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full h-11 px-3 text-xs bg-zinc-50 border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-700 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
            >
              <option value="">-- Select Variant --</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Hash className="h-3 w-3 text-zinc-400" />
              Inward Quantity
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="E.g. 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3.5 text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-805 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
            />
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-zinc-400" />
              Cost Price (₹/unit)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="E.g. 24.50"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full h-11 px-3.5 text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-bold text-zinc-805 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* Batch Number */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Hash className="h-3 w-3 text-zinc-400" />
            Batch / Reference ID
          </label>
          <input
            type="text"
            placeholder="E.g. BTCH-TOM-2026-A"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            className="w-full h-11 px-3.5 text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-805 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <FileText className="h-3 w-3 text-zinc-400" />
            Inward Description / Notes
          </label>
          <textarea
            rows={3}
            placeholder="E.g. Nasik farm supplier direct mandi shipment inward"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3.5 text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl font-medium text-zinc-805 dark:bg-zinc-850 dark:border-zinc-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:scale-100"
        >
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>Ingest Stock Inward</>
          )}
        </button>
      </form>
    </div>
  );
}
