'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  SlidersHorizontal, 
  Star, 
  Heart, 
  X, 
  ChevronRight, 
  Search, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  mrp: string;
  sellingPrice: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  mrp: string;
  sellingPrice: string;
  stockType: string;
  images: string[] | null;
  isFeatured: boolean;
  category: { name: string; slug: string };
  brand?: { name: string } | null;
  variants: Variant[];
}

interface CatalogWrapperProps {
  initialProducts: Product[];
  categoriesList: any[];
  brandsList: any[];
  totalProductsCount: number;
}

export default function CatalogWrapper({
  initialProducts,
  categoriesList,
  brandsList,
  totalProductsCount,
}: CatalogWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Filters from URL
  const currentQuery = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentSortBy = searchParams.get('sortBy') || 'newest';

  // Local filter states
  const [search, setSearch] = useState(currentQuery);
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [sortBy, setSortBy] = useState(currentSortBy);

  const handleAddToCart = async (product: Product, qty = 1) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: qty,
          variantId: product.variants && product.variants.length > 0 ? product.variants[0].id : null,
        }),
      });

      if (res.ok) {
        window.dispatchEvent(new Event('cart-updated'));
        setAddedItemIds(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => {
          setAddedItemIds(prev => ({ ...prev, [product.id]: false }));
        }, 1500);
        return;
      }

      if (res.status === 401) {
        const guestCart = localStorage.getItem('guest_cart');
        let cartItems: any[] = [];
        if (guestCart) {
          try {
            cartItems = JSON.parse(guestCart);
          } catch (e) {
            cartItems = [];
          }
        }

        const variantId = product.variants && product.variants.length > 0 ? product.variants[0].id : null;
        const existingIdx = cartItems.findIndex(
          (item) => item.productId === product.id && item.variantId === variantId
        );

        if (existingIdx > -1) {
          cartItems[existingIdx].quantity += qty;
        } else {
          cartItems.push({
            id: crypto.randomUUID(),
            productId: product.id,
            variantId,
            quantity: qty,
            product: {
              name: product.name,
              slug: product.slug,
              mrp: product.mrp,
              sellingPrice: product.sellingPrice,
              images: product.images,
            },
            variant: product.variants && product.variants.length > 0 ? {
              name: product.variants[0].name,
              mrp: product.variants[0].mrp,
              sellingPrice: product.variants[0].sellingPrice,
            } : null,
          });
        }

        localStorage.setItem('guest_cart', JSON.stringify(cartItems));
        window.dispatchEvent(new Event('cart-updated'));
        setAddedItemIds(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => {
          setAddedItemIds(prev => ({ ...prev, [product.id]: false }));
        }, 1500);
      } else {
        console.error('Failed to add product to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== currentQuery) {
        updateFilters({ q: search });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Update products when query URL parameters change
  useEffect(() => {
    setProductsList(initialProducts);
  }, [initialProducts]);

  // General URL updater helper
  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Set or delete key value pairs
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    setLoading(true);
    router.push(`/catalog?${params.toString()}`);
    setLoading(false);
  };

  const handleClearAll = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    router.push('/catalog');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      
      {/* 1. TOP UTILITY: SEARCH & MOBILE TOGGLE */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search within catalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
          />
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="flex sm:hidden items-center justify-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 active:scale-95 transition-all"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              updateFilters({ sortBy: e.target.value });
            }}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating_desc">Sort: Featured</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flex gap-8 items-start">
        
        {/* 2. DESKTOP FILTER SIDEBAR */}
        <aside className="hidden md:flex flex-col gap-8 w-60 shrink-0 sticky top-20 max-h-[80vh] overflow-y-auto pr-4 no-scrollbar">
          
          {/* Active Filter Indicators */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Filters</h3>
            {(currentCategory || currentBrand || currentMinPrice || currentMaxPrice || currentQuery) && (
              <button 
                onClick={handleClearAll}
                className="text-[10px] font-bold text-rose-500 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Categories Tree */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Categories</h4>
            <div className="flex flex-col gap-1.5">
              {categoriesList.map((cat) => {
                const isActive = currentCategory === cat.slug;
                return (
                  <div key={cat.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => updateFilters({ category: cat.slug })}
                      className={`flex items-center justify-between text-left text-xs py-1 transition-colors ${
                        isActive 
                          ? 'text-emerald-500 font-bold' 
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className={`h-3 w-3 transition-transform ${isActive ? 'rotate-90 text-emerald-500' : 'text-zinc-400'}`} />
                    </button>
                    {/* Render subcategories if current category is selected */}
                    {isActive && cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pl-3 border-l border-zinc-100 dark:border-zinc-800 flex flex-col gap-1 mt-0.5">
                        {cat.subcategories.map((sub: any) => (
                          <button
                            key={sub.id}
                            onClick={() => updateFilters({ category: sub.slug })}
                            className="text-left text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 py-0.5 transition-colors"
                          >
                            • {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brands list */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Brands</h4>
            <div className="flex flex-col gap-2">
              {brandsList.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => updateFilters({ brand: currentBrand === brand.id ? '' : brand.id })}
                  className={`flex items-center gap-2 text-xs text-left transition-colors ${
                    currentBrand === brand.id 
                      ? 'text-emerald-500 font-bold' 
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${currentBrand === brand.id ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300'}`}>
                    {currentBrand === brand.id && '✓'}
                  </span>
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range inputs */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Price Range</h4>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => updateFilters({ minPrice })}
                className="h-8 w-full rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => updateFilters({ maxPrice })}
                className="h-8 w-full rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>
          </div>

        </aside>

        {/* 3. PRODUCT LIST GRID */}
        <div className="flex-1 flex flex-col gap-8">
          
          {loading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : productsList.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm min-h-[350px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/20">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-50">No Products Found</h3>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                We couldn't find any products matching your selected query or filters. Try adjusting your parameters.
              </p>
              <button
                onClick={handleClearAll}
                className="mt-6 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-6 py-2.5 shadow-sm transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            /* PRODUCT CARDS */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {productsList.map((prod) => (
                <div 
                  key={prod.id}
                  className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <button className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-zinc-400 hover:text-rose-500 backdrop-blur-sm transition-colors active:scale-95 shadow-sm">
                    <Heart className="h-4 w-4" />
                  </button>

                  <Link href={`/product/${prod.slug}`} className="flex flex-col gap-2 cursor-pointer">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-950 p-1">
                      <Image 
                        src={(prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'}
                        alt={prod.name}
                        fill
                        className="rounded-lg object-cover p-0.5 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                      {prod.category.name}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">
                      {prod.name}
                    </h3>
                  </Link>

                  <div className="flex flex-col gap-3 mt-3">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded self-start">
                      Unit: 1 {prod.stockType || 'kg'}
                    </span>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-extrabold text-zinc-950 dark:text-zinc-50">
                          ₹{prod.sellingPrice}
                        </span>
                        {prod.mrp && prod.mrp !== prod.sellingPrice && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through">
                            ₹{prod.mrp}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleAddToCart(prod)}
                        className={`rounded-lg active:scale-95 text-[11px] font-extrabold px-3 py-1.5 shadow-sm transition-all ${
                          addedItemIds[prod.id]
                            ? 'bg-emerald-600 text-white border border-emerald-600'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }`}
                      >
                        {addedItemIds[prod.id] ? 'Added ✓' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* 4. MOBILE SLIDING DRAWER FOR FILTERS */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Overlay */}
          <div 
            onClick={() => setMobileFiltersOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          {/* Drawer content */}
          <div className="relative z-10 flex h-full w-80 flex-col bg-white p-6 shadow-2xl dark:bg-zinc-900 animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Filter Products</h3>
              <button 
                onClick={() => setMobileFiltersOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 no-scrollbar">
              {/* Categories */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {categoriesList.map((cat) => {
                    const isActive = currentCategory === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          updateFilters({ category: isActive ? '' : cat.slug });
                          setMobileFiltersOpen(false);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                          isActive 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Price Range</h4>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    onBlur={() => updateFilters({ minPrice })}
                    className="h-9 w-full rounded border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <span className="text-zinc-400">-</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    onBlur={() => updateFilters({ maxPrice })}
                    className="h-9 w-full rounded border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 flex gap-3">
              <button
                onClick={() => {
                  handleClearAll();
                  setMobileFiltersOpen(false);
                }}
                className="flex-1 rounded-xl border border-zinc-200 py-3 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white hover:bg-emerald-600"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
