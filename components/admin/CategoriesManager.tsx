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
  FolderTree, 
  Sparkles 
} from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  status: string;
  parentName?: string | null;
}

interface CategoriesManagerProps {
  initialCategories: Category[];
}

export default function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const router = useRouter();
  const [categoriesList, setCategoriesList] = useState<Category[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setParentId('');
    setImageUrl('');
    setDescription('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parentId || '');
    setImageUrl(cat.imageUrl || '');
    setDescription(cat.description || '');
    setStatus(cat.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      parentId: parentId || null,
      imageUrl: imageUrl || null,
      description: description || null,
      status,
    };

    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}` 
        : '/api/admin/categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsModalOpen(false);
        router.refresh();
        window.location.reload();
      } else {
        alert(json.message || 'Failed to save category');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Network error. Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? If there are products inside this category, they will remain but will lack a valid category assignment.')) return;

    try {
      const res = await fetch(`/api/admin/categories/${catId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCategoriesList(prev => prev.filter(c => c.id !== catId));
        router.refresh();
      } else {
        alert(json.message || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Network error. Failed to delete category.');
    }
  };

  const filteredCategories = categoriesList.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
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
              <FolderTree className="h-6 w-6 text-emerald-500" />
              Categories Management
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Create, organize, or restructure product categories and subcategories.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-5 py-3 shadow-md flex items-center justify-center gap-1.5 transition-all self-start cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Category
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search categories by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
          />
        </div>

        {/* Categories Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-medium">
              No categories found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 pl-6">Category Name</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4">Parent Category</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-xs font-semibold text-zinc-750 dark:text-zinc-300">
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                      <td className="p-4 pl-6 font-bold text-zinc-900 dark:text-zinc-50">
                        {cat.name}
                      </td>
                      <td className="p-4 font-mono">{cat.slug}</td>
                      <td className="p-4 text-zinc-500 dark:text-zinc-450">
                        {cat.parentName || <span className="italic text-zinc-400">Root Category</span>}
                      </td>
                      <td className="p-4 text-zinc-500 max-w-xs truncate">{cat.description || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                          cat.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {cat.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-550 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-505 dark:border-rose-950/20 dark:hover:bg-rose-950/10 transition-colors cursor-pointer"
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

      {/* Add / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0"
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto no-scrollbar animate-zoom-in">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-5">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
                {editingCategory ? 'Edit Catalog Category' : 'Add New Catalog Category'}
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
                <label className="text-[10px] font-bold uppercase text-zinc-400">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dairy & Butter"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Parent Category</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                >
                  <option value="">None (Make Root Category)</option>
                  {categoriesList
                    .filter(c => !editingCategory || c.id !== editingCategory.id) // Prevent self-referencing hierarchy loops
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Milk products, paneer, and eggs"
                  className="h-20 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
                >
                  <option value="active">Active (Visible in Catalog)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:border-zinc-705 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850"
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
                    'Save Category'
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
