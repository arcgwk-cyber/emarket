import React, { Suspense } from 'react';
import LoginForm from '@/components/customer/LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center font-sans text-xs font-bold text-zinc-400">
        Loading Auth Form...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
