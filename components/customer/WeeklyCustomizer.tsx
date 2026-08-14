'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  images: string[] | any;
  stockType: string;
  weightG: number | null;
}

interface SelectionGroup {
  garnish: string[];
  seasonal: string[];
  cooking: string[];
  leafy: string[];
}

interface WeeklyCustomizerProps {
  subscriptionId: string;
  planName: string;
  deliveryDate: string;
  limits: {
    maxGarnish: number;
    maxSeasonal: number;
    maxCooking: number;
    maxLeafy: number;
  };
  initialSelections: SelectionGroup;
  fixedList: Product[];
  garnishList: Product[];
  seasonalList: Product[];
  cookingList: Product[];
  leafyList: Product[];
}

export default function WeeklyCustomizer({
  subscriptionId,
  planName,
  deliveryDate,
  limits,
  initialSelections,
  fixedList,
  garnishList,
  seasonalList,
  cookingList,
  leafyList,
}: WeeklyCustomizerProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0); // 0: Essentials, 1: Garnish, 2: Seasonal, 3: Cooking, 4: Leafy Greens, 5: Review
  const [selections, setSelections] = useState<SelectionGroup>({
    garnish: initialSelections?.garnish || [],
    seasonal: initialSelections?.seasonal || [],
    cooking: initialSelections?.cooking || [],
    leafy: initialSelections?.leafy || [],
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const steps = [
    { name: 'Essentials', desc: 'Staples pre-added for you' },
    { name: 'Garnish', desc: `Select ${limits.maxGarnish} item` },
    { name: 'Seasonal', desc: `Select ${limits.maxSeasonal} items (500g each)` },
    { name: 'Cooking', desc: `Select ${limits.maxCooking} items (250g each)` },
    { name: 'Leafy', desc: `Select ${limits.maxLeafy} items` },
    { name: 'Review', desc: 'Review and lock your basket' },
  ];

  const handleToggleItem = (group: keyof SelectionGroup, productId: string, limit: number) => {
    setSelections((prev) => {
      const current = prev[group];
      const exists = current.includes(productId);

      if (exists) {
        return {
          ...prev,
          [group]: current.filter((id) => id !== productId),
        };
      } else {
        if (current.length >= limit) {
          // Alert or do nothing since limit reached
          return prev;
        }
        return {
          ...prev,
          [group]: [...current, productId],
        };
      }
    });
  };

  const handleSave = async () => {
    // Basic checks
    if (selections.garnish.length !== limits.maxGarnish) {
      setErrorMsg(`Please select exactly ${limits.maxGarnish} Garnish item`);
      return;
    }
    if (selections.seasonal.length !== limits.maxSeasonal) {
      setErrorMsg(`Please select exactly ${limits.maxSeasonal} Seasonal items`);
      return;
    }
    if (selections.cooking.length !== limits.maxCooking) {
      setErrorMsg(`Please select exactly ${limits.maxCooking} Cooking items`);
      return;
    }
    if (selections.leafy.length !== limits.maxLeafy) {
      setErrorMsg(`Please select exactly ${limits.maxLeafy} Leafy greens`);
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/selections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate,
          selections,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Basket saved successfully for delivery on ' + new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '!');
        router.refresh();
      } else {
        setErrorMsg(json.message || 'Failed to save choices');
      }
    } catch (e) {
      setErrorMsg('Network error. Failed to save choices.');
    } finally {
      setSaving(false);
    }
  };

  const getProductById = (id: string, list: Product[]) => list.find((p) => p.id === id);

  const getStepProgressWidth = () => {
    return `${(activeStep / (steps.length - 1)) * 100}%`;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-1.5 leading-none">
          <Sparkles className="h-5 w-5 text-emerald-500" /> Customize Your Weekly Basket
        </h1>
        <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">
          {planName} • Delivery Date: <span className="text-zinc-700 dark:text-zinc-300 font-extrabold">{new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="relative mb-10">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800 -translate-y-1/2 rounded-full -z-10" />
        <div
          style={{ width: getStepProgressWidth() }}
          className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full -z-10 transition-all duration-300"
        />
        <div className="flex justify-between items-center">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isActive = idx === activeStep;
            return (
              <button
                key={step.name}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 border-2 border-emerald-500 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                {isCompleted ? '✓' : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Body */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm min-h-[350px] mb-8">
        <div className="mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50">{steps[activeStep].name}</h2>
          <p className="text-xs font-semibold text-zinc-400 mt-0.5">{steps[activeStep].desc}</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-500 p-3 rounded-2xl text-xs font-bold border border-red-200/50 mb-6">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold border border-emerald-200/50 mb-6 text-center flex flex-col items-center gap-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {successMsg}
          </div>
        )}

        {/* STEP 0: ESSENTIALS (FIXED) */}
        {activeStep === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-zinc-500 leading-relaxed mb-2">
              These base items are essential staples for Indian cooking and are pre-added to your family basket every week. They do not count toward your choices.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fixedList.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border border-zinc-100 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                  <img
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&auto=format&fit=crop&q=80'}
                    alt={item.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="text-xs">
                    <p className="font-extrabold text-zinc-850 dark:text-zinc-100">{item.name}</p>
                    <p className="text-zinc-400 font-medium mt-0.5">Quantity: 1 {item.stockType || 'kg'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: GARNISH CHOICE */}
        {activeStep === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {garnishList.map((item) => {
              const isSelected = selections.garnish.includes(item.id);
              const limitReached = selections.garnish.length >= limits.maxGarnish && !isSelected;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={limitReached}
                  onClick={() => handleToggleItem('garnish', item.id, limits.maxGarnish)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/5 border-2 shadow-sm'
                      : limitReached
                      ? 'opacity-40 border-zinc-100 dark:border-zinc-850 cursor-not-allowed'
                      : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      className="h-12 w-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="text-xs">
                      <p className="font-extrabold text-zinc-800 dark:text-zinc-100">{item.name}</p>
                      <p className="text-zinc-400 font-medium mt-0.5">Quantity: 1 unit / bunch</p>
                    </div>
                  </div>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300'
                  }`}>
                    {isSelected && <span className="text-[10px] font-black">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2: SEASONAL VEGGIES */}
        {activeStep === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase">
              <span>Choose any {limits.maxSeasonal} items</span>
              <span className={selections.seasonal.length === limits.maxSeasonal ? 'text-emerald-500' : 'text-zinc-500'}>
                Selected: {selections.seasonal.length} / {limits.maxSeasonal}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {seasonalList.map((item) => {
                const isSelected = selections.seasonal.includes(item.id);
                const limitReached = selections.seasonal.length >= limits.maxSeasonal && !isSelected;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={limitReached}
                    onClick={() => handleToggleItem('seasonal', item.id, limits.maxSeasonal)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/5 border-2 shadow-sm'
                        : limitReached
                        ? 'opacity-40 border-zinc-100 dark:border-zinc-850 cursor-not-allowed'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.images?.[0] || 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="text-xs">
                        <p className="font-extrabold text-zinc-800 dark:text-zinc-100">{item.name}</p>
                        <p className="text-zinc-400 font-medium mt-0.5">Quantity: 500g</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300'
                    }`}>
                      {isSelected && <span className="text-[10px] font-black">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: COOKING VEGGIES */}
        {activeStep === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase">
              <span>Choose any {limits.maxCooking} items</span>
              <span className={selections.cooking.length === limits.maxCooking ? 'text-emerald-500' : 'text-zinc-500'}>
                Selected: {selections.cooking.length} / {limits.maxCooking}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cookingList.map((item) => {
                const isSelected = selections.cooking.includes(item.id);
                const limitReached = selections.cooking.length >= limits.maxCooking && !isSelected;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={limitReached}
                    onClick={() => handleToggleItem('cooking', item.id, limits.maxCooking)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/5 border-2 shadow-sm'
                        : limitReached
                        ? 'opacity-40 border-zinc-100 dark:border-zinc-850 cursor-not-allowed'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.images?.[0] || 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="text-xs">
                        <p className="font-extrabold text-zinc-800 dark:text-zinc-100">{item.name}</p>
                        <p className="text-zinc-400 font-medium mt-0.5">Quantity: 250g</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300'
                    }`}>
                      {isSelected && <span className="text-[10px] font-black">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: LEAFY GREENS */}
        {activeStep === 4 && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase">
              <span>Choose any {limits.maxLeafy} items</span>
              <span className={selections.leafy.length === limits.maxLeafy ? 'text-emerald-500' : 'text-zinc-500'}>
                Selected: {selections.leafy.length} / {limits.maxLeafy}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leafyList.map((item) => {
                const isSelected = selections.leafy.includes(item.id);
                const limitReached = selections.leafy.length >= limits.maxLeafy && !isSelected;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={limitReached}
                    onClick={() => handleToggleItem('leafy', item.id, limits.maxLeafy)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/5 border-2 shadow-sm'
                        : limitReached
                        ? 'opacity-40 border-zinc-100 dark:border-zinc-850 cursor-not-allowed'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.images?.[0] || 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="text-xs">
                        <p className="font-extrabold text-zinc-800 dark:text-zinc-100">{item.name}</p>
                        <p className="text-zinc-400 font-medium mt-0.5">Quantity: 1 bunch</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300'
                    }`}>
                      {isSelected && <span className="text-[10px] font-black">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & SAVE */}
        {activeStep === 5 && (
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold text-zinc-500 leading-relaxed">
              Review your weekly basket selections. You can edit any step by clicking the timeline nodes above. Click **Lock and Save Selections** below to confirm!
            </p>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 bg-zinc-50/30">
              {/* Garnish */}
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Garnish (Select {limits.maxGarnish})</p>
                <div className="flex flex-wrap gap-2">
                  {selections.garnish.map((id) => {
                    const prod = getProductById(id, garnishList);
                    return prod ? (
                      <span key={id} className="text-xs font-bold text-zinc-700 bg-white px-3 py-1.5 border border-zinc-200 rounded-xl dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-200">
                        {prod.name} (1 bunch)
                      </span>
                    ) : null;
                  })}
                  {selections.garnish.length === 0 && <span className="text-xs text-red-500 font-bold">⚠️ None selected</span>}
                </div>
              </div>

              {/* Seasonal */}
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Seasonal Veggies (Select {limits.maxSeasonal})</p>
                <div className="flex flex-wrap gap-2">
                  {selections.seasonal.map((id) => {
                    const prod = getProductById(id, seasonalList);
                    return prod ? (
                      <span key={id} className="text-xs font-bold text-zinc-700 bg-white px-3 py-1.5 border border-zinc-200 rounded-xl dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-200">
                        {prod.name} (500g)
                      </span>
                    ) : null;
                  })}
                  {selections.seasonal.length !== limits.maxSeasonal && <span className="text-xs text-red-500 font-bold">⚠️ Selected: {selections.seasonal.length} / {limits.maxSeasonal}</span>}
                </div>
              </div>

              {/* Cooking */}
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Cooking Veggies (Select {limits.maxCooking})</p>
                <div className="flex flex-wrap gap-2">
                  {selections.cooking.map((id) => {
                    const prod = getProductById(id, cookingList);
                    return prod ? (
                      <span key={id} className="text-xs font-bold text-zinc-700 bg-white px-3 py-1.5 border border-zinc-200 rounded-xl dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-200">
                        {prod.name} (250g)
                      </span>
                    ) : null;
                  })}
                  {selections.cooking.length !== limits.maxCooking && <span className="text-xs text-red-500 font-bold">⚠️ Selected: {selections.cooking.length} / {limits.maxCooking}</span>}
                </div>
              </div>

              {/* Leafy */}
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Leafy Greens (Select {limits.maxLeafy})</p>
                <div className="flex flex-wrap gap-2">
                  {selections.leafy.map((id) => {
                    const prod = getProductById(id, leafyList);
                    return prod ? (
                      <span key={id} className="text-xs font-bold text-zinc-700 bg-white px-3 py-1.5 border border-zinc-200 rounded-xl dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-200">
                        {prod.name} (1 bunch)
                      </span>
                    ) : null;
                  })}
                  {selections.leafy.length !== limits.maxLeafy && <span className="text-xs text-red-500 font-bold">⚠️ Selected: {selections.leafy.length} / {limits.maxLeafy}</span>}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md hover:bg-emerald-600 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Lock & Save Selections'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((prev) => prev - 1)}
          className={`flex items-center gap-1 text-xs font-bold px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer ${
            activeStep === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-zinc-50 dark:hover:bg-zinc-850'
          }`}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {activeStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveStep((prev) => prev + 1)}
            className="flex items-center gap-1 text-xs font-black px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-850 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer shadow-sm"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/account/subscriptions')}
            className="text-xs font-black text-emerald-500 hover:underline cursor-pointer"
          >
            Exit Customizer
          </button>
        )}
      </div>
    </div>
  );
}
