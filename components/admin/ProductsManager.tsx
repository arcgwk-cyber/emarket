'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  ChevronLeft, 
  Tag, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  brandId: string | null;
  description: string | null;
  shortDescription: string | null;
  mrp: string;
  sellingPrice: string;
  costPrice: string | null;
  stockType: string;
  weightG: number | null;
  isFeatured: boolean;
  status: string;
  category?: { name: string } | null;
  brand?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductsManagerProps {
  initialProducts: Product[];
  categoriesList: Category[];
  brandsList: Brand[];
}

export default function ProductsManager({ 
  initialProducts, 
  categoriesList, 
  brandsList 
}: ProductsManagerProps) {
  const router = useRouter();
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockType, setStockType] = useState('piece');
  const [weightG, setWeightG] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [initialStock, setInitialStock] = useState('0');
  const [stockAdjustment, setStockAdjustment] = useState('0');

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setCategoryId(categoriesList[0]?.id || '');
    setBrandId('');
    setDescription('');
    setShortDescription('');
    setMrp('');
    setSellingPrice('');
    setCostPrice('');
    setStockType('piece');
    setWeightG('');
    setIsFeatured(false);
    setInitialStock('0');
    setStockAdjustment('0');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategoryId(prod.categoryId);
    setBrandId(prod.brandId || '');
    setDescription(prod.description || '');
    setShortDescription(prod.shortDescription || '');
    setMrp(prod.mrp);
    setSellingPrice(prod.sellingPrice);
    setCostPrice(prod.costPrice || '');
    setStockType(prod.stockType);
    setWeightG(prod.weightG ? prod.weightG.toString() : '');
    setIsFeatured(prod.isFeatured);
    setInitialStock('0');
    setStockAdjustment('0');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      sku,
      categoryId,
      brandId: brandId || null,
      description,
      shortDescription,
      mrp: parseFloat(mrp),
      sellingPrice: parseFloat(sellingPrice),
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stockType,
      weightG: weightG ? parseInt(weightG) : null,
      isFeatured,
      initialStock: editingProduct ? undefined : parseInt(initialStock),
      stockAdjustment: editingProduct ? parseInt(stockAdjustment) : undefined,
    };

    try {
      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}` 
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsModalOpen(false);
        router.refresh();
        // Force update local list or reload page
        window.location.reload();
      } else {
        alert(json.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Network error. Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (prodId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/admin/products/${prodId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProductsList(prev => prev.filter(p => p.id !== prodId));
        router.refresh();
      } else {
        alert(json.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Network error. Failed to delete product.');
    }
  };

  const filteredProducts = productsList.filter(prod =>
    prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Tag className="h-6 w-6 text-emerald-555" />
              Products Management
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Add, edit, or delete supermarket grocery items and sync store inventories.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-5 py-3 shadow-md flex items-center justify-center gap-1.5 transition-all self-start"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
          />
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-medium">
              No products found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 pl-6">Product Details</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Brand</th>
                    <th className="p-4">MRP / Selling</th>
                    <th className="p-4 text-center">Featured</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-xs font-semibold text-zinc-750 dark:text-zinc-300">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                      <td className="p-4 pl-6">
                        <span className="font-bold text-zinc-900 dark:text-zinc-50 block">
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 capitalize block mt-0.5">
                          Unit: 1 {prod.stockType}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{prod.sku}</td>
                      <td className="p-4">{prod.category?.name || 'Unassigned'}</td>
                      <td className="p-4">{prod.brand?.name || 'None'}</td>
                      <td className="p-4">
                        <span className="line-through text-zinc-450 mr-2">₹{prod.mrp}</span>
                        <span className="font-black text-zinc-900 dark:text-zinc-50">₹{prod.sellingPrice}</span>
                      </td>
                      <td className="p-4 text-center">
                        {prod.isFeatured ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase dark:bg-emerald-950/20 dark:text-emerald-400">
                            Yes
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-medium">No</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-550 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
                            className="p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 dark:border-rose-950/20 dark:hover:bg-rose-950/10 transition-colors"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Slide-over Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto no-scrollbar animate-zoom-in">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-5">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
                {editingProduct ? 'Edit Catalog Product' : 'Add New Catalog Product'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 text-zinc-400 hover:text-zinc-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fresh Organic Tomatoes"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="VEG-TOM-001"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Brand</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  >
                    <option value="">None (Generic)</option>
                    {brandsList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Stock Unit Type</label>
                  <select
                    value={stockType}
                    onChange={(e) => setStockType(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  >
                    <option value="piece">Piece (Unit)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gram">Gram (g)</option>
                    <option value="litre">Litre (L)</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    placeholder="50.00"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="40.00"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="25.00"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Net Weight (Grams)</label>
                  <input
                    type="number"
                    value={weightG}
                    onChange={(e) => setWeightG(e.target.value)}
                    placeholder="e.g. 500"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                  />
                </div>

                {!editingProduct ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Initial Stock</label>
                    <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      placeholder="100"
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Stock Adjustment (+ / -)</label>
                    <input
                      type="number"
                      value={stockAdjustment}
                      onChange={(e) => setStockAdjustment(e.target.value)}
                      placeholder="e.g. +10 or -5"
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Short Description</label>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="One sentence description of item..."
                  className="h-16 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="isFeatured" className="text-xs font-bold text-zinc-750 cursor-pointer">
                  Feature this product on homepage catalog rows
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-705 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Product'
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
