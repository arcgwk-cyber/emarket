'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Plus, 
  Minus,
  Check
} from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  sku: string;
  mrp: string;
  sellingPrice: string;
  stock: number;
  weightG: number | null;
  images: string[] | null;
  attributes: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  shortDescription: string | null;
  mrp: string;
  sellingPrice: string;
  stockType: string;
  images: string[] | null;
  isVariableWeight: boolean;
  weightG?: number | null;
  category: { name: string; slug: string };
  brand?: { name: string } | null;
  dietType?: string | null;
  dietaryPreferences?: string[] | null;
  variants: Variant[];
}

interface ProductDetailWrapperProps {
  product: Product;
  relatedProducts: any[];
}

export default function ProductDetailWrapper({
  product,
  relatedProducts,
}: ProductDetailWrapperProps) {
  // Variant Selection State
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    hasVariants ? product.variants[0] : null
  );

  // Cart quantity
  const [quantity, setQuantity] = useState(1);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // Gallery Active Image
  const allImages = (selectedVariant?.images && selectedVariant.images.length > 0) 
    ? selectedVariant.images 
    : (product.images && product.images.length > 0) 
      ? product.images 
      : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'];
  const [activeImage, setActiveImage] = useState(allImages[0]);

  React.useEffect(() => {
    setActiveImage(allImages[0]);
  }, [allImages[0]]);

  // Pricing configuration based on variant selection
  const mrp = selectedVariant ? selectedVariant.mrp : product.mrp;
  const sellingPrice = selectedVariant ? selectedVariant.sellingPrice : product.sellingPrice;
  const discountPercent = Math.round(
    ((parseFloat(mrp) - parseFloat(sellingPrice)) / parseFloat(mrp)) * 100
  );
  
  const currentStock = selectedVariant ? selectedVariant.stock : 0;
  const isOutOfStock = currentStock <= 0;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
    if (variant.images && variant.images.length > 0) {
      setActiveImage(variant.images[0]);
    }
  };

  const handleAddToCart = async () => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          variantId: selectedVariant ? selectedVariant.id : null,
        }),
      });

      if (res.ok) {
        window.dispatchEvent(new Event('cart-updated'));
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 1500);
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

        const variantId = selectedVariant ? selectedVariant.id : null;
        const existingIdx = cartItems.findIndex(
          (item) => item.productId === product.id && item.variantId === variantId
        );

        if (existingIdx > -1) {
          cartItems[existingIdx].quantity += quantity;
        } else {
          cartItems.push({
            id: crypto.randomUUID(),
            productId: product.id,
            variantId,
            quantity,
            product: {
              name: product.name,
              slug: product.slug,
              mrp: product.mrp,
              sellingPrice: product.sellingPrice,
              images: product.images,
            },
            variant: selectedVariant ? {
              name: selectedVariant.name,
              mrp: selectedVariant.mrp,
              sellingPrice: selectedVariant.sellingPrice,
            } : null,
          });
        }

        localStorage.setItem('guest_cart', JSON.stringify(cartItems));
        window.dispatchEvent(new Event('cart-updated'));
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 1500);
      } else {
        console.error('Failed to add product to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 pb-6">
        <Link href="/" className="hover:text-emerald-500 transition-colors">Home</Link>
        <span>/</span>
        <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-emerald-500 transition-colors">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-800 dark:text-zinc-300 truncate max-w-[200px]">
          {product.name}
        </span>
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-10 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        
        {/* LEFT COLUMN: IMAGES */}
        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          {/* Thumbnails list */}
          {allImages.length > 1 && (
            <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto pb-2 sm:pb-0 w-full sm:w-16 shrink-0 max-h-[350px] no-scrollbar">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative h-14 w-14 sm:w-full shrink-0 aspect-square overflow-hidden rounded-xl border p-1 bg-white dark:bg-zinc-950 transition-all cursor-pointer ${
                    activeImage === img 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Image src={img} alt={`Thumb ${idx}`} fill className="object-cover rounded-lg" />
                </button>
              ))}
            </div>
          )}

          <div className="relative aspect-square flex-1 w-full overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
            <Image 
              src={activeImage}
              alt={product.name}
              fill
              priority
              className="object-cover p-2 rounded-2xl"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white shadow-sm">
                Save {discountPercent}%
              </span>
            )}
            {isOutOfStock && (
              <span className="absolute top-4 right-4 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-black text-white uppercase tracking-wider shadow-md">
                Out of Stock
              </span>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CONTENT */}
        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              {product.brand && (
                <span className="text-xs font-bold text-zinc-500 underline cursor-pointer hover:text-emerald-500 transition-colors uppercase tracking-wider">
                  {product.brand.name}
                </span>
              )}
              
              <div className="flex gap-2">
                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="rounded-full border border-zinc-200 p-2 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500 active:scale-95 transition-all dark:border-zinc-800 cursor-pointer"
                >
                  {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Share2 className="h-4.5 w-4.5" />}
                </button>
                {/* Wishlist */}
                <button
                  onClick={() => setWishlistActive(!wishlistActive)}
                  className={`rounded-full border border-zinc-200 p-2 active:scale-95 transition-all dark:border-zinc-800 cursor-pointer ${
                    wishlistActive 
                      ? 'text-rose-500 border-rose-500 bg-rose-50 dark:bg-rose-950/20' 
                      : 'text-zinc-500 hover:text-rose-500 hover:border-rose-500'
                  }`}
                >
                  <Heart className={`h-4.5 w-4.5 ${wishlistActive ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {product.dietType && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 rounded bg-zinc-50 border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  product.dietType === 'veg' ? 'border-green-200 text-green-700 dark:border-green-900/35 dark:text-green-400 dark:bg-green-950/15' : 
                  product.dietType === 'non-veg' ? 'border-red-200 text-red-700 dark:border-red-900/35 dark:text-red-400 dark:bg-red-950/15' :
                  'border-amber-200 text-amber-700 dark:border-amber-900/35 dark:text-amber-400 dark:bg-amber-950/15'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    product.dietType === 'veg' ? 'bg-green-500' :
                    product.dietType === 'non-veg' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  {product.dietType === 'veg' ? 'Veg' : product.dietType === 'non-veg' ? 'Non-Veg' : 'Egg'}
                </span>
                {product.dietaryPreferences && product.dietaryPreferences.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-550 tracking-tight leading-tight">
              {product.name}
            </h1>
            
            {/* Rating Stars */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex items-center text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                <Star className="h-3.5 w-3.5 fill-amber-500 stroke-none mr-0.5" />
                4.8
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold hover:underline cursor-pointer">
                (24 Verified Reviews)
              </span>
            </div>
          </div>

          {/* Pricing detail block */}
          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400 font-bold">
              MRP: <span className="line-through">₹{mrp}</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-950 dark:text-zinc-50">
                Price: ₹{sellingPrice}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {selectedVariant?.weightG ? `(₹${((parseFloat(sellingPrice) / selectedVariant.weightG) * 100).toFixed(2)} / 100g)` : product.weightG ? `(₹${((parseFloat(sellingPrice) / product.weightG) * 100).toFixed(2)} / 100g)` : ''}
              </span>
            </div>
            {discountPercent > 0 && (
              <span className="text-xs font-black text-green-600 dark:text-green-400">
                You Save: {discountPercent}% OFF
              </span>
            )}
            <span className="text-[10px] text-zinc-400 font-semibold">
              (inclusive of all taxes)
            </span>
          </div>

          {/* Product Description */}
          {product.shortDescription && (
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-semibold">
              {product.shortDescription}
            </p>
          )}

          {/* QUANTITY CONTROL & ADD TO BASKET */}
          <div className="flex gap-3 items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {isOutOfStock ? (
              <button
                disabled
                className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 text-xs font-black py-3.5 flex items-center justify-center gap-2 cursor-not-allowed"
              >
                Out of Stock
              </button>
            ) : (
              <>
                {/* Quantity Selector */}
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50 shrink-0">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:shadow-sm dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= currentStock}
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:shadow-sm dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Add to Cart button (bright red) */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 rounded-xl active:scale-95 text-white text-xs font-black py-3.5 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isAdded
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-[#c80000] hover:bg-[#b00000]'
                  }`}
                >
                  <ShoppingCart className="h-4.5 w-4.5" />
                  {isAdded ? 'Added to Cart ✓' : 'Add to Cart'}
                </button>
              </>
            )}

            {/* Wishlist button */}
            <button
              onClick={() => setWishlistActive(!wishlistActive)}
              className={`rounded-xl border px-4 py-3.5 text-xs font-black transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0 ${
                wishlistActive
                  ? 'border-rose-500 bg-rose-50 text-rose-500 dark:bg-rose-950/20'
                  : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-350'
              }`}
            >
              <Heart className={`h-4.5 w-4.5 ${wishlistActive ? 'fill-rose-500 text-rose-500' : 'text-zinc-500'}`} />
              Wishlist
            </button>
          </div>

          {/* PACK SIZES OPTION LIST */}
          {hasVariants ? (
            <div className="flex flex-col gap-3 mt-4">
              <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">
                Pack sizes
              </h4>
              <div className="flex flex-col gap-3">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const varDiscount = Math.round(
                    ((parseFloat(v.mrp) - parseFloat(v.sellingPrice)) / parseFloat(v.mrp)) * 100
                  );
                  
                  // Calculate unit rate
                  let unitRateText = '';
                  if (v.weightG) {
                    unitRateText = `(₹${((parseFloat(v.sellingPrice) / v.weightG) * 100).toFixed(2)} / 100g)`;
                  } else {
                    unitRateText = `(₹${v.sellingPrice} / unit)`;
                  }

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVariantSelect(v)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-green-600 bg-green-50/5 dark:border-green-500 dark:bg-green-950/5 shadow-sm'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                          {v.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end text-right">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-black text-zinc-905 dark:text-zinc-50">
                              ₹{v.sellingPrice}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-medium">
                              {unitRateText}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-zinc-400 line-through">
                              ₹{v.mrp}
                            </span>
                            {varDiscount > 0 && (
                              <span className="bg-green-50 text-green-750 dark:bg-green-950/20 dark:text-green-400 px-1 py-0.2 rounded text-[8px] font-black uppercase">
                                {varDiscount}% OFF
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-zinc-105 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-700/40">
                            ⚡ 10 MINS
                          </span>
                          {isSelected && (
                            <span className="text-green-600 dark:text-green-500 text-xs font-black">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">
                Pack sizes
              </h4>
              <div className="w-full flex items-center justify-between p-4 rounded-2xl border border-green-600 bg-green-50/5 dark:border-green-500 dark:bg-green-950/5 shadow-sm text-left">
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                  1 {product.stockType} ({product.weightG ? `${product.weightG}g` : 'Standard'})
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end text-right">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-50">
                        ₹{sellingPrice}
                      </span>
                      {product.weightG && (
                        <span className="text-[9px] text-zinc-400 font-medium">
                          (₹{((parseFloat(sellingPrice) / product.weightG) * 100).toFixed(2)} / 100g)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-zinc-400 line-through">
                        ₹{mrp}
                      </span>
                      {discountPercent > 0 && (
                        <span className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 px-1 py-0.2 rounded text-[8px] font-black uppercase">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-700/40">
                      ⚡ 10 MINS
                    </span>
                    <span className="text-green-600 dark:text-green-500 text-xs font-black">
                      ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery & Trust Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-105 dark:border-zinc-800/80 mt-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              <Truck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Same Day Slots</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Safety Certified</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              <RefreshCw className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Easy 7-day Return</span>
            </div>
          </div>

          {/* Specifications Accordion */}
          {product.description && (
            <div className="mt-4 flex flex-col gap-2">
              <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Product Details</h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

        </div>

      </div>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 flex flex-col gap-6">
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Related Products</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedProducts.map((p) => (
              <div 
                key={p.id}
                className="group relative flex flex-col justify-between rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <Link href={`/product/${p.slug}`} className="flex flex-col gap-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-950 p-1">
                    <Image 
                      src={(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60'}
                      alt={p.name}
                      fill
                      className="rounded-md object-cover p-0.5 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 leading-snug">
                    {p.name}
                  </h4>
                  <span className="text-[11px] font-extrabold text-zinc-950 dark:text-zinc-50">
                    ₹{p.sellingPrice}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
