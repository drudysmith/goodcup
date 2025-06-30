import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Session } from '@supabase/supabase-js';
import { supabaseAnon } from '../supabaseClient';

// State Mgmt Update 2: Centralized session query
const fetchSupabaseSession = async (): Promise<Session | null> => {
  const { data: { session }, error } = await supabaseAnon.auth.getSession();
  
  if (error) {
    console.error('Error fetching Supabase session:', error);
    return null;
  }

  // Module 7: Session detection logging
  if (session) {
    console.log('🔄 User session detected — loading user state');
  } else {
    console.log('🚪 No user session — falling back to visitor auth');
  }

  return session;
};

export const useSupabaseSession = () => {
  return useQuery({
    queryKey: ['supabaseSession'],
    queryFn: fetchSupabaseSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Helper to update session in query cache
export const useSupabaseSessionHelpers = () => {
  const queryClient = useQueryClient();

  const setSessionData = (session: Session | null) => {
    queryClient.setQueryData(['supabaseSession'], session);
  };

  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: ['supabaseSession'] });
  };

  return { setSessionData, invalidateSession };
}; 