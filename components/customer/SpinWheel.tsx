'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Gift, HelpCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpinWheelProps {
  initialSpinsAvailable: number;
  completedDeliveries: number;
  prizeHistory: Array<{ prize: string; date: string }>;
}

export default function SpinWheel({
  initialSpinsAvailable,
  completedDeliveries,
  prizeHistory,
}: SpinWheelProps) {
  const [spinsLeft, setSpinsLeft] = useState(initialSpinsAvailable);
  const [history, setHistory] = useState(prizeHistory);
  const [isSpinning, setIsSpinning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [winMessage, setWinMessage] = useState('');
  
  const wheelRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);

  const prizes = [
    { name: 'Handbag 👜', color: '#10B981' },      // Green
    { name: 'Perfume 🧴', color: '#EC4899' },      // Pink
    { name: 'Free Veggies 🥬', color: '#84CC16' },  // Lime
    { name: '₹50 Voucher 💰', color: '#EAB308' },  // Yellow
    { name: 'Free Delivery ⚡', color: '#F97316' }, // Orange
    { name: 'Try Again 🍀', color: '#64748B' },     // Slate
  ];

  const handleSpin = async () => {
    if (isSpinning || spinsLeft <= 0) return;
    
    setIsSpinning(true);
    setErrorMsg('');
    setWinMessage('');

    try {
      const res = await fetch('/api/rewards/spin', { method: 'POST' });
      const json = await res.json();

      if (res.ok && json.success) {
        const { sliceIndex, prizeName, spinsLeft: newSpins } = json.data;

        // Calculate degrees: 6 slices, each is 60deg.
        // To align sliceIndex at the top pointer (0deg/360deg), we need rotation angle:
        // Angle = (360 * 5) - (sliceIndex * 60) - 30 (center of slice)
        const baseRotations = 5; // 5 full spins
        const sliceAngle = 60;
        const targetRotation = (baseRotations * 360) - (sliceIndex * sliceAngle) - 30;

        setRotation(targetRotation);

        // Wait for spin animation (5 seconds)
        setTimeout(() => {
          setIsSpinning(false);
          setSpinsLeft(newSpins);
          setWinMessage(prizeName);
          setHistory(prev => [{ prize: prizeName, date: new Date().toISOString().split('T')[0] }, ...prev]);
          
          if (!prizeName.includes('Try Again')) {
            confetti({
              particleCount: 180,
              spread: 80,
              origin: { y: 0.5 }
            });
          }
        }, 5000);

      } else {
        setIsSpinning(false);
        setErrorMsg(json.message || 'Error occurred while spinning');
      }
    } catch (err) {
      setIsSpinning(false);
      setErrorMsg('Network error. Please try again.');
    }
  };

  const progressPercent = Math.min(100, ((completedDeliveries % 4) / 4) * 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Marketing Header */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 animate-pulse">
          <Sparkles className="h-3 w-3" /> Exclusive Rewards Game
        </span>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mb-3">
          4-Week Subscription Spin Wheel!
        </h1>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Complete 4 consecutive weekly vegetable deliveries to earn 1 spin credit. Spin the wheel to win premium handbag, designer perfumes, cash vouchers, or free veggies!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* LEFT COLUMN: SPIN WHEEL */}
        <div className="flex flex-col items-center justify-center">
          {/* Spin Wheel SVG Wrap */}
          <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/50 p-6 rounded-full border border-zinc-150 dark:border-zinc-800 shadow-inner">
            
            {/* Top Pointer Arrow */}
            <div className="absolute top-1 z-20 -translate-y-2 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-zinc-900 dark:border-t-zinc-200 drop-shadow-md" />
              <div className="h-2 w-2 rounded-full bg-red-500 -mt-1 shadow-sm" />
            </div>

            {/* The SVG Wheel */}
            <svg
              ref={wheelRef}
              viewBox="0 0 200 200"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 5000ms cubic-bezier(0.15, 0.88, 0.15, 0.98)' : 'none',
              }}
              className="w-full h-full drop-shadow-lg"
            >
              <g transform="translate(100, 100)">
                {/* 6 colored slices */}
                {prizes.map((prize, idx) => {
                  const angleStart = idx * 60;
                  const angleEnd = (idx + 1) * 60;
                  // SVG path for a circular pie segment
                  const x1 = 90 * Math.cos((angleStart - 90) * Math.PI / 180);
                  const y1 = 90 * Math.sin((angleStart - 90) * Math.PI / 180);
                  const x2 = 90 * Math.cos((angleEnd - 90) * Math.PI / 180);
                  const y2 = 90 * Math.sin((angleEnd - 90) * Math.PI / 180);
                  
                  // Label orientation
                  const labelAngle = angleStart + 30;
                  const lx = 60 * Math.cos((labelAngle - 90) * Math.PI / 180);
                  const ly = 60 * Math.sin((labelAngle - 90) * Math.PI / 180);

                  return (
                    <g key={idx}>
                      <path
                        d={`M 0 0 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`}
                        fill={prize.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={lx}
                        y={ly}
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="900"
                        textAnchor="middle"
                        transform={`rotate(${labelAngle}, ${lx}, ${ly})`}
                      >
                        {prize.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
                {/* Inner center button circle */}
                <circle r="20" fill="#1e1b4b" stroke="#ffffff" strokeWidth="2" />
                <circle r="8" fill="#ffffff" />
              </g>
            </svg>
          </div>

          {/* Action Trigger */}
          <div className="mt-8 text-center w-full max-w-xs">
            {winMessage && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl text-xs font-black border border-emerald-200/50 mb-4 animate-fade-in">
                🎉 Won: {winMessage}
              </div>
            )}
            {errorMsg && (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800 p-3.5 rounded-2xl text-xs font-bold text-zinc-500 mb-4">
                {errorMsg}
              </div>
            )}
            
            <button
              type="button"
              disabled={isSpinning || spinsLeft <= 0}
              onClick={handleSpin}
              className={`w-full py-4 rounded-2xl text-xs font-black tracking-wide shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                spinsLeft > 0 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isSpinning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Spinning...
                </>
              ) : (
                `Spin Wheel (${spinsLeft} Credits)`
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PROGRESS & HISTORY */}
        <div className="flex flex-col gap-6">
          {/* Progress Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <Gift className="h-4 w-4 text-emerald-500" /> Subscription Progress
            </h3>

            {/* Delivery Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                <span>Conseq. Deliveries Completed</span>
                <span className="text-emerald-500">{completedDeliveries % 4} / 4 runs</span>
              </div>
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            <p className="text-[10px] font-semibold text-zinc-400 leading-normal flex items-start gap-1">
              <HelpCircle className="h-3.5 w-3.5 shrink-0 text-zinc-400 mt-0.5" />
              Progress resets every 4 completed deliveries. Ensure your subscription remains active (not cancelled or expired) to secure your streak!
            </p>
          </div>

          {/* History Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[200px]">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-4">
                Prizes History Log
              </h3>
              {history.length === 0 ? (
                <p className="text-xs font-semibold text-zinc-400 text-center py-6">
                  No rewards claimed yet. Unlock your first spin credit!
                </p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {history.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold py-1.5 border-b border-dashed border-zinc-100 dark:border-zinc-800 last:border-b-0">
                      <span className="text-zinc-700 dark:text-zinc-300">{log.prize}</span>
                      <span className="text-zinc-400">{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
