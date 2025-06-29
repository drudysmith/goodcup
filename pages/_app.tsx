import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisitorProvider } from '../lib/contexts/VisitorContext';

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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <VisitorProvider>
        <Component {...pageProps} />
      </VisitorProvider>
    </QueryClientProvider>
  );
}
