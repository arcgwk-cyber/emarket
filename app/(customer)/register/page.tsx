import React, { Suspense } from 'react';
import RegisterForm from '@/components/customer/RegisterForm';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center font-sans text-xs font-bold text-zinc-400">
        Loading Auth Form...
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
