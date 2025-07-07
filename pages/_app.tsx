import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisitorProvider } from '../lib/contexts/VisitorContext';
import { useSupabaseSessionHelpers } from '../lib/queries/sessionQueries';
import { supabaseAnon } from '../lib/supabaseClient';

// Create QueryClient with optimized defaults for the application
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - can be overridden per query
      staleTime: 2 * 60 * 1000, // 2 minutes default
      // Prevent unnecessary background refetches for better UX
      refetchOnWindowFocus: false,
      // Retry failed queries with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on auth errors to prevent loops
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 2;
      },
      // Cache for 5 minutes after component unmount
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      // Default retry configuration for mutations
      retry: (failureCount, error) => {
        // Don't retry mutations on auth errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        // Only retry once for mutations to avoid duplicate operations
        return failureCount < 1;
      },
    },
  },
});

// Bug 5: Global Auth State Listener Component
function GlobalAuthListener() {
  const { setSessionData } = useSupabaseSessionHelpers();

  useEffect(() => {
    console.log('🔄 Bug 5: Setting up global auth state listener');

    // Bug 5: Register auth state change listener
    const { data: { subscription } } = supabaseAnon.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Bug 5: Auth state changed:', { event, userId: session?.user?.id || null });

      // Bug 5: Update session data in query cache
      setSessionData(session);
      console.log('✅ Bug 5: Updated supabaseSession query with new auth state');
    });

    // Bug 5: Cleanup function to unsubscribe
    return () => {
      console.log('🧹 Bug 5: Cleaning up global auth state listener');
      subscription.unsubscribe();
    };
  }, [setSessionData]);

  return null; // This component only handles side effects
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <VisitorProvider>
        <GlobalAuthListener />
        <Component {...pageProps} />
      </VisitorProvider>
    </QueryClientProvider>
  );
}
