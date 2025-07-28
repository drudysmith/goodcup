import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisitorProvider, useVisitor } from '../lib/contexts/VisitorContext';
import { useSupabaseSessionHelpers } from '../lib/queries/sessionQueries';
import { useVisitorMerge } from '../lib/hooks/useVisitorMerge';
import { supabaseAnon } from '../lib/supabaseClient';
import { initMobileLogger } from '../lib/utils/mobileLogger';

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
  // Bug Module 8C: Get visitor context and merge hook
  const { visitorId } = useVisitor();
  const visitorMerge = useVisitorMerge();
  
  // Bug Module 8C: Track processed sign-in events to prevent duplicate merges
  const lastProcessedSignInRef = useRef<string | null>(null);

  // Stable Global Auth Listener: Use refs to prevent re-subscription
  const visitorIdRef = useRef(visitorId);
  const triggerMergeRef = useRef(visitorMerge.triggerMerge);

  // Stable Global Auth Listener: Update refs when values change
  useEffect(() => {
    visitorIdRef.current = visitorId;
  }, [visitorId]);

  useEffect(() => {
    triggerMergeRef.current = visitorMerge.triggerMerge;
  }, [visitorMerge.triggerMerge]);

  useEffect(() => {
    // Bug 5: Register auth state change listener
    const { data: { subscription } } = supabaseAnon.auth.onAuthStateChange((event, session) => {
      // Bug 5: Update session data in query cache
      setSessionData(session);

      // Bug Module 8C: Handle SIGNED_IN event for visitor merge
      if (event === 'SIGNED_IN' && session?.user?.id && visitorIdRef.current) {
        const signInEventId = `${session.user.id}-${Date.now()}`;
        
        // Bug Module 8C: Prevent duplicate merge for same sign-in
        if (lastProcessedSignInRef.current !== signInEventId) {
          // Add console log for verification
          console.log('[Auth] Merging visitor', visitorIdRef.current);
          
          // Bug Module 8C: Trigger visitor merge
          triggerMergeRef.current();
          
          // Bug Module 8C: Track this sign-in to prevent duplicates
          lastProcessedSignInRef.current = signInEventId;
        }
      }
    });

    // Bug 5: Cleanup function to unsubscribe
    return () => {
      subscription.unsubscribe();
    };
  }, [setSessionData]); // Stable Global Auth Listener: Only depend on stable setSessionData

  return null; // This component only handles side effects
}

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initMobileLogger();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <VisitorProvider>
        <GlobalAuthListener />
        <Component {...pageProps} />
      </VisitorProvider>
    </QueryClientProvider>
  );
}
