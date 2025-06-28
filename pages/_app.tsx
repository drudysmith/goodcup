import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisitorProvider } from '../lib/contexts/VisitorContext';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {

  return (
    <QueryClientProvider client={queryClient}>
      <VisitorProvider>
      <Component {...pageProps} />
      </VisitorProvider>
    </QueryClientProvider>
  );
}
