'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Utensils, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  badge: string;
  title: string;
  highlightText: string;
  description: string;
  btn1Text: string;
  btn1Href: string;
  btn2Text: string;
  btn2Href: string;
  btn1Icon: React.ReactNode;
  btn2Icon: React.ReactNode;
  imageUrl: string;
  bgGradient: string;
  rotationClass: string;
}

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      badge: 'All-In-One Delivery Marketplace',
      title: 'Fresh Groceries Served ',
      highlightText: 'Instantly',
      description: 'Get farm-fresh vegetables, organic produce, daily milk, and groceries delivered right to your doorstep in active slots.',
      btn1Text: 'Browse Supermarket',
      btn1Href: '/catalog',
      btn2Text: 'Order Hot Food',
      btn2Href: '/catalog?category=cloud-kitchen',
      btn1Icon: <ArrowRight className="h-4 w-4" />,
      btn2Icon: <Utensils className="h-4 w-4" />,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
      bgGradient: 'from-emerald-600 to-teal-800',
      rotationClass: 'rotate-2 hover:rotate-0',
    },
    {
      badge: 'Chef Prepared Daily Meals',
      title: 'Diet Meal Plans & ',
      highlightText: 'Cloud Kitchen',
      description: 'Savor healthy, delicious dinners prepared by expert chefs. Choose customized keto, calorie-count, or home-style meal plans.',
      btn1Text: 'Order Kitchen Meals',
      btn1Href: '/catalog?category=cloud-kitchen',
      btn2Text: 'Daily Subscriptions',
      btn2Href: '/catalog?subscription=true',
      btn1Icon: <Utensils className="h-4 w-4" />,
      btn2Icon: <Calendar className="h-4 w-4" />,
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
      bgGradient: 'from-amber-600 to-red-800',
      rotationClass: '-rotate-2 hover:rotate-0',
    },
    {
      badge: 'Save Big on Recurring Essentials',
      title: 'Daily Subscriptions & ',
      highlightText: 'Deals',
      description: 'Unlock special discounts on milk, bread, eggs, and weekly meal plans. Subscriptions automate orders so you never run out.',
      btn1Text: 'Explore Subscriptions',
      btn1Href: '/catalog?subscription=true',
      btn2Text: 'Apply Coupons',
      btn2Href: '/catalog',
      btn1Icon: <Calendar className="h-4 w-4" />,
      btn2Icon: <ArrowRight className="h-4 w-4" />,
      imageUrl: 'https://images.unsplash.com/photo-1526368798175-9734e779a655?w=500&auto=format&fit=crop&q=80',
      bgGradient: 'from-blue-600 to-indigo-800',
      rotationClass: 'rotate-1 hover:rotate-0',
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl text-white shadow-xl min-h-[460px] md:min-h-[400px] flex items-center">
      {/* Slider Slides */}
      {slides.map((slide, idx) => {
        const isActive = idx === currentSlide;
        return (
          <div
            key={idx}
            className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient} transition-all duration-700 ease-in-out flex items-center ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent)]" />
            <div className="relative w-full flex flex-col md:flex-row items-center justify-between gap-8 p-8 sm:p-12 md:p-16">
              
              {/* Content Block */}
              <div className="flex flex-col gap-5 max-w-xl text-center md:text-left items-center md:items-start select-none">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[10px] sm:text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {slide.badge}
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  {slide.title}
                  <span className="text-orange-400 dark:text-orange-300">{slide.highlightText}</span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-100/90 leading-relaxed font-medium">
                  {slide.description}
                </p>
                <div className="flex flex-wrap gap-3 mt-2 justify-center md:justify-start">
                  <Link
                    href={slide.btn1Href}
                    className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    {slide.btn1Text}
                    {slide.btn1Icon}
                  </Link>
                  <Link
                    href={slide.btn2Href}
                    className="rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 text-xs sm:text-sm backdrop-blur-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    {slide.btn2Text}
                    {slide.btn2Icon}
                  </Link>
                </div>
              </div>

              {/* Image Block */}
              <div className="relative w-full max-w-[200px] sm:max-w-[260px] md:max-w-[300px] aspect-square flex justify-center items-center">
                <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl" />
                <div className="relative w-full h-full">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    fill
                    priority={idx === 0}
                    className={`rounded-2xl shadow-2xl object-cover border-4 border-white/15 transition-transform duration-500 ease-out ${slide.rotationClass}`}
                  />
                </div>
              </div>

            </div>
          </div>
        );
      })}

      {/* Navigation Chevrons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 z-20 p-2 rounded-full bg-black/10 hover:bg-black/25 text-white/70 hover:text-white transition-all backdrop-blur-sm active:scale-90"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 z-20 p-2 rounded-full bg-black/10 hover:bg-black/25 text-white/70 hover:text-white transition-all backdrop-blur-sm active:scale-90"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentSlide ? 'w-6 bg-orange-400' : 'w-2 bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
