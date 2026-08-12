'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Phone, Loader2, ArrowRight, Info } from 'lucide-react';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Format phone to E.164 (add +91 if 10 digits and doesn't start with +)
    let formattedPhone = mobile.trim();
    if (formattedPhone && /^\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          mobile: formattedPhone || undefined 
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.data.assignedRole === 'Super Admin'
            ? 'Success! System bootstrapped as Super Admin. Redirecting to login...'
            : 'Account created successfully! Redirecting to login...'
        );
        setTimeout(() => {
          router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
        }, 2550);
      } else {
        setErrorMsg(json.message || 'Registration failed');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-900 p-8 sm:p-10 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-md">
        
        {/* Title */}
        <div className="text-center">
          <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full tracking-wide inline-block">
            Register Account
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create Profile
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            Register to set up delivery addresses, wallets, and subscriptions
          </p>
        </div>

        {/* Info box: Bootstrap alert */}
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 flex gap-2">
          <Info className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>System Bootstrap Mode:</strong> The first user account created in this database is automatically allocated the <strong>Super Admin</strong> role with full root management access.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30">
            ⚠ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-bold text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30">
            ✓ {successMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Full Name</label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Kumar"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@domain.com"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500 dark:text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Mobile Number (WhatsApp Ready)</label>
            <div className="relative">
              <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9999999999"
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
                placeholder="Min 6 characters"
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
                Create Account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

        </form>

        <div className="text-center pt-4 border-t border-zinc-50 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            Already have an account?{' '}
            <Link 
              href={`/login?redirect=${encodeURIComponent(redirect)}`} 
              className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Sign In Here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
