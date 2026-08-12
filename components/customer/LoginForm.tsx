'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        router.refresh();
        router.push(redirect);
      } else {
        setErrorMsg(json.message || 'Invalid email or password');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 sm:p-10 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-md">
        
        {/* Title branding */}
        <div className="text-center">
          <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full tracking-wide inline-block">
            Member Access
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome Back
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            Sign in to manage your cart, active subscriptions, and tracking orders
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30">
            ⚠ {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Password</label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

        </form>

        <div className="text-center pt-4 border-t border-zinc-50 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            Don't have an account?{' '}
            <Link 
              href={`/register?redirect=${encodeURIComponent(redirect)}`} 
              className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Sign Up Free
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
