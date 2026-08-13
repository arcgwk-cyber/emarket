import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  Star, 
  CheckCircle, 
  Calendar, 
  Utensils, 
  Apple, 
  Heart 
} from 'lucide-react';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import PwaInstallBanner from '@/components/customer/PwaInstallBanner';

// Fallback Mock Data in case DB is not yet populated
const FALLBACK_CATEGORIES = [
  { id: '1', name: 'Vegetables', slug: 'vegetables', imageUrl: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&auto=format&fit=crop&q=60' },
  { id: '2', name: 'Fruits', slug: 'fruits', imageUrl: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=300&auto=format&fit=crop&q=60' },
  { id: '3', name: 'Dairy & Eggs', slug: 'dairy-eggs', imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=60' },
  { id: '4', name: 'Meats & Poultry', slug: 'meats-poultry', imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=60' },
  { id: '5', name: 'Cloud Kitchen', slug: 'cloud-kitchen', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=60' },
  { id: '6', name: 'Healthy Meals', slug: 'healthy-meals', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&auto=format&fit=crop&q=60' },
];

const FALLBACK_PRODUCTS = [
  {
    id: '1',
    name: 'Fresh Red Tomatoes',
    slug: 'fresh-red-tomato',
    mrp: '50.00',
    sellingPrice: '40.00',
    stockType: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60',
    categorySlug: 'vegetables',
    rating: 4.8,
  },
  {
    id: '2',
    name: 'Organic Royal Apples',
    slug: 'organic-red-apple',
    mrp: '150.00',
    sellingPrice: '120.00',
    stockType: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60',
    categorySlug: 'fruits',
    rating: 4.9,
  },
  {
    id: '3',
    name: 'Amul Full Cream Milk',
    slug: 'full-cream-milk',
    mrp: '33.00',
    sellingPrice: '30.00',
    stockType: '500ml',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60',
    categorySlug: 'dairy-eggs',
    rating: 4.7,
  },
  {
    id: '4',
    name: 'Raw Chicken Breast Boneless',
    slug: 'fresh-raw-chicken-breast',
    mrp: '260.00',
    sellingPrice: '220.00',
    stockType: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=60',
    categorySlug: 'meats-poultry',
    rating: 4.6,
  },
  {
    id: '5',
    name: 'Classic Butter Chicken Meal Box',
    slug: 'butter-chicken-meal-box',
    mrp: '280.00',
    sellingPrice: '250.00',
    stockType: 'pack',
    imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=60',
    categorySlug: 'cloud-kitchen',
    rating: 4.9,
  },
  {
    id: '6',
    name: 'Keto Grilled Chicken Salad',
    slug: 'keto-grilled-chicken-salad',
    mrp: '200.00',
    sellingPrice: '180.00',
    stockType: 'pack',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=60',
    categorySlug: 'healthy-meals',
    rating: 4.8,
  }
];

export default async function HomePage() {
  let dbCategories: any[] = [];
  let dbProducts: any[] = [];

  try {
    // Try to pull live categories from Postgres/Supabase database
    dbCategories = await db.select().from(categories).limit(8);
    dbProducts = await db.select().from(products).where(sql`${products.status} = 'active'`).limit(8);
  } catch (error) {
    console.warn('PostgreSQL connection offline or not initialized. Loading mockup configurations.');
  }

  const activeCategories = dbCategories.length > 0 ? dbCategories : FALLBACK_CATEGORIES;
  const activeProducts = dbProducts.length > 0 ? dbProducts : FALLBACK_PRODUCTS;

  return (
    <div className="flex flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      {/* 1. HERO BANNER SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-8 sm:p-12 md:p-16">
          <div className="flex flex-col gap-6 max-w-xl text-center md:text-left items-center md:items-start">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              All-In-One Delivery Marketplace
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Fresh Groceries & <span className="text-emerald-300">Cloud Kitchen</span> Served Instantly
            </h1>
            <p className="text-sm sm:text-base text-zinc-100/90 leading-relaxed font-medium">
              Get organic vegetables, fresh meats, dairy, or hot chef-made diet plans delivered in active daily slots. Activate subscriptions for daily fresh milk and meals.
            </p>
            <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
              <Link 
                href="/catalog" 
                className="rounded-full bg-white hover:bg-zinc-100 text-emerald-800 font-bold px-6 py-3 text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                Browse Supermarket
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/catalog?category=cloud-kitchen" 
                className="rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 text-xs sm:text-sm backdrop-blur-sm transition-all active:scale-95 flex items-center gap-2"
              >
                Order Hot Food
                <Utensils className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-square flex justify-center items-center">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl" />
            <Image 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80"
              alt="Grocery Box Mockup"
              width={350}
              height={350}
              priority
              className="rounded-2xl shadow-2xl object-cover border-4 border-emerald-500/20 transform rotate-2 hover:rotate-0 transition-transform duration-300"
            />
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES ROW */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">Shop by Category</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Explore different business models supported from one screen</p>
          </div>
        </div>
        
        {/* Horizontal scroll grid */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          {activeCategories.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/catalog?category=${cat.slug}`}
              className="flex flex-col items-center gap-3 shrink-0 group"
            >
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 p-1 transition-all group-hover:shadow-md group-hover:scale-105 active:scale-95 duration-200">
                <Image 
                  src={cat.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60'}
                  alt={cat.name}
                  fill
                  className="rounded-xl object-cover p-0.5"
                />
              </div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. TODAY'S DISCOUNTS & OFFERS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <Sparkles className="h-40 w-40" />
          </div>
          <div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">Flash Discount</span>
            <h3 className="text-lg font-black mt-3">₹100 Off On First Grocery Order</h3>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="font-mono text-sm bg-white/20 px-3 py-1 rounded-md font-bold">WELCOME100</span>
            <span className="text-xs font-semibold underline cursor-pointer">Use Code</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <Calendar className="h-40 w-40" />
          </div>
          <div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">Milk Subscriptions</span>
            <h3 className="text-lg font-black mt-3">Save 10% On Daily Milk Delivery</h3>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="font-mono text-sm bg-white/20 px-3 py-1 rounded-md font-bold">DAILYMILK</span>
            <span className="text-xs font-semibold underline cursor-pointer">Apply Code</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px] md:col-span-2 lg:col-span-1">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <Utensils className="h-40 w-40" />
          </div>
          <div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">Kitchen Combos</span>
            <h3 className="text-lg font-black mt-3">Free Delivery On Kitchen Orders</h3>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">Above ₹299</span>
            <span className="text-xs font-semibold underline cursor-pointer">Order Now</span>
          </div>
        </div>
      </section>

      {/* 4. BEST SELLERS SECTION */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">Best Sellers & Fresh Items</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Directly sourced, packed with hygiene and temperature controlled</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
          {activeProducts.map((prod) => (
            <div 
              key={prod.id} 
              className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Heart icon / Favorite */}
              <button className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-zinc-400 hover:text-rose-500 backdrop-blur-sm transition-colors active:scale-95 shadow-sm">
                <Heart className="h-4 w-4" />
              </button>

              <div className="flex flex-col gap-2">
                {/* Product Image */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-950 p-1">
                  <Image 
                    src={prod.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60'}
                    alt={prod.name}
                    fill
                    className="rounded-lg object-cover p-0.5 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Info */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="flex items-center text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    <Star className="h-3 w-3 fill-amber-500 stroke-none mr-0.5" />
                    {prod.rating || '4.8'}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">
                  {prod.name}
                </h3>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded self-start">
                  Unit: 1 {prod.stockType || 'kg'}
                </span>
              </div>

              {/* Price & Add button */}
              <div className="flex items-center justify-between mt-4">
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
                  className="rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-extrabold px-3 py-1.5 shadow-sm transition-all flex items-center gap-1"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. MEAL SUBSCRIPTIONS PROMO SECTION */}
      <section className="rounded-2xl border border-zinc-100 bg-emerald-50/50 dark:border-zinc-800 dark:bg-emerald-950/10 p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex flex-col gap-4 max-w-xl text-center lg:text-left items-center lg:items-start">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <Calendar className="h-4 w-4" />
            Recurring Subscriptions
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Automate Daily Deliveries
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Tired of ordering every day? Subscribe to daily Milk & Eggs, weekly fresh vegetable baskets, or monthly pantry grocery packs. Setup customized meal schedules for diet plans and pause or skip anytime in your customer dashboard.
          </p>
          <div className="flex flex-wrap gap-4 mt-2 justify-center lg:justify-start">
            <Link 
              href="/catalog?subscription=true" 
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 text-xs sm:text-sm shadow-md transition-colors"
            >
              Explore Plans
            </Link>
            <Link 
              href="/account/subscriptions" 
              className="rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold px-5 py-2.5 text-xs sm:text-sm transition-colors dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Manage My Subscriptions
            </Link>
          </div>
        </div>
        <div className="relative w-full max-w-[260px] sm:max-w-[320px] aspect-[4/3] flex justify-center items-center shrink-0">
          <Image 
            src="https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=450&auto=format&fit=crop&q=80"
            alt="Healthy meal subscription packages"
            width={350}
            height={260}
            className="rounded-xl shadow-xl object-cover border border-emerald-500/10"
          />
        </div>
      </section>

      {/* 6. TRUST & BRAND BENEFITS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-zinc-100 pt-8 dark:border-zinc-800">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-2">No Contact Delivery</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Orders are packed under clinical levels of hygiene and dropped right at your door with safety verification.</p>
        </div>
        
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-2">Flexible Order Slots</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Select early morning slots for milk and curd, or evening slots for fresh meat and hot kitchen meals.</p>
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Apple className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-2">Strict FEFO Quality</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">First-Expiry-First-Out batch tracing is enabled inside our smart warehouse ledger. No expired milk ever.</p>
        </div>
      </section>

      {/* 7. APP INSTALLATION & PWA BANNER */}
      <PwaInstallBanner />

      {/* FOOTER */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 mt-8 pt-8 pb-4 text-center text-zinc-500 dark:text-zinc-400">
        <p className="text-xs">© 2026 E-Market Multi-Business eCommerce Platform. Powered by Next.js & Supabase.</p>
      </footer>
      
    </div>
  );
}
