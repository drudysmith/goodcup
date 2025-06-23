import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVisitorTracking } from '../lib/hooks/useVisitorTracking';
import { SupabaseProvider } from '../lib/contexts/SupabaseContext';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient();

// Component that initializes visitor tracking - client-side only
function VisitorTracker() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useVisitorTracking();

  // Prevent any potential SSR hydration issues
  if (!hasMounted) {
    return null;
  }

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <VisitorTracker />
        <Component {...pageProps} />
      </SupabaseProvider>
    </QueryClientProvider>
  );
}
