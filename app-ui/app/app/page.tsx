'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppProvider } from '@shopify/app-bridge-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppContent from '@/components/AppContent';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function AppPage() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || searchParams.get('shopOrigin');
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !shop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const appConfig = {
    apiKey: apiKey,
    shopOrigin: shop,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider config={appConfig}>
        <AppContent shop={shop} />
      </AppProvider>
    </QueryClientProvider>
  );
}
