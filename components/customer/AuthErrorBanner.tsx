'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function ErrorBannerContent() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    code: string | null;
    message: string | null;
  }>({ code: null, message: null });

  useEffect(() => {
    // Check both query params and hash params (Supabase often redirects with hash fragments)
    const errorCode = searchParams.get('error_code');
    const errorDesc = searchParams.get('error_description') || searchParams.get('error');

    if (errorCode || errorDesc) {
      setErrorDetails({
        code: errorCode,
        message: errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Authentication failed',
      });
      setVisible(true);
    }
  }, [searchParams]);

  if (!visible) return null;

  const isOtpExpired = errorDetails.code === 'otp_expired';

  return (
    <div className="w-full bg-rose-50 border-b border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 px-4 py-3 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-7xl flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-extrabold text-rose-800 dark:text-rose-350">
              {isOtpExpired ? 'Email Confirmation Link Expired' : 'Authentication Error'}
            </span>
            <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed font-medium">
              {isOtpExpired ? (
                <>
                  The confirmation link has expired or has already been used. 
                  <span className="block mt-1 font-semibold text-rose-800 dark:text-rose-300">
                    💡 If testing locally, you can disable "Confirm email" in your Supabase Dashboard under 
                    <code className="mx-1 px-1 py-0.5 bg-rose-100 dark:bg-rose-900/40 rounded font-mono text-[10px]">
                      Authentication &gt; Providers &gt; Email
                    </code>.
                  </span>
                </>
              ) : (
                errorDetails.message
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="flex items-center gap-1 text-[11px] font-bold text-rose-800 dark:text-rose-300 hover:underline"
          >
            Go to Login
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => {
              setVisible(false);
              // Clean up the URL query params without reloading the page
              const url = new URL(window.location.href);
              url.searchParams.delete('error');
              url.searchParams.delete('error_code');
              url.searchParams.delete('error_description');
              window.history.replaceState({}, '', url.pathname + url.search);
            }}
            className="rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/40 p-1 text-rose-400 hover:text-rose-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <ErrorBannerContent />
    </Suspense>
  );
}
