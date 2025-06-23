import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, updateSupabaseAuth } from '../supabaseClient';
import { getVisitorUUID } from '../visitorUtils';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isReady: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isReady: false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return;
    
    // Prevent duplicate initialization
    if (isInitialized) return;

    const initializeSupabase = () => {
      const visitorId = getVisitorUUID();
      
      if (visitorId) {
        console.log('🔄 Initializing Supabase context with visitor ID');
        const client = getSupabaseClient(); // Get singleton client
        setSupabase(client);
        setIsReady(true);
        setIsInitialized(true);
        
        // Update auth on existing client
        updateSupabaseAuth();
      } else {
        console.log('⏳ Waiting for visitor ID to initialize Supabase context');
        // Retry after a short delay if no visitor ID yet
        setTimeout(initializeSupabase, 100);
      }
    };

    // Listen for JWT generation completion
    const handleJWTReady = () => {
      if (!isInitialized) {
        console.log('🔄 JWT ready event received, updating auth on singleton client');
        updateSupabaseAuth(); // Update auth instead of recreating client
      }
    };

    window.addEventListener('visitor-jwt-ready', handleJWTReady);
    initializeSupabase();

    return () => {
      window.removeEventListener('visitor-jwt-ready', handleJWTReady);
    };
  }, [isInitialized]);

  return (
    <SupabaseContext.Provider value={{ supabase, isReady }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseContextType {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
} 