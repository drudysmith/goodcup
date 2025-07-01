import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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

// Module 8: Session refresh function
const attemptSessionRefresh = async (): Promise<Session | null> => {
  try {
    console.log('🔄 Module 8: Attempting silent session refresh');
    const { data: { session }, error } = await supabaseAnon.auth.refreshSession();
    
    if (error) {
      console.error('Module 8: Session refresh failed:', error);
      return null;
    }

    if (session) {
      console.log('✅ Module 8: Session refresh successful');
      return session;
    }

    console.log('⚠️ Module 8: Session refresh returned null session');
    return null;
  } catch (error) {
    console.error('Module 8: Session refresh error:', error);
    return null;
  }
};

// Module 8: Session expiry detection and handling
export const handleSessionExpiry = async (queryClient: any): Promise<boolean> => {
  console.log('⏰ User session expired — prompting re-auth');
  
  // First attempt silent refresh
  const refreshedSession = await attemptSessionRefresh();
  
  if (refreshedSession) {
    // Update session in cache
    queryClient.setQueryData(['supabaseSession'], refreshedSession);
    console.log('✅ Module 8: Session successfully refreshed');
    return true;
  }

  // Refresh failed, clear session and prompt for re-auth
  console.log('❌ Module 8: Session refresh failed — clearing session');
  queryClient.setQueryData(['supabaseSession'], null);
  
  // Session expiry will trigger Module 7.5 popup via session change detection
  return false;
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

  // Module 8: Session expiry handler
  const handleExpiredSession = async (): Promise<boolean> => {
    return await handleSessionExpiry(queryClient);
  };

  return { setSessionData, invalidateSession, handleExpiredSession };
};

// Module 8: Hook to detect and handle API authentication errors
export const useSessionExpiryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await handleSessionExpiry(queryClient);
    },
    onSuccess: (refreshed) => {
      if (!refreshed) {
        // Trigger re-authentication flow
        console.log('🔄 Module 8: Triggering re-authentication flow');
      }
    }
  });
}; 