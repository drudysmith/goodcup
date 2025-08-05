import { useMutation } from '@tanstack/react-query';
import { supabaseAnon } from '../supabaseClient';
import { useSupabaseSessionHelpers } from '../queries/sessionQueries';

interface AuthActionsState {
  isLoading: boolean;
  error: string | null;
  requiresConfirmation: boolean;
}

interface AuthActionsReturn extends AuthActionsState {
  signUp: (email: string, password: string, redirectUrl?: string) => void;
  signInWithPassword: (email: string, password: string) => void;
  signInWithOtp: (email: string, redirectUrl?: string) => void;
}

// Bug Module 6A: useAuthActions Hook
export const useAuthActions = (): AuthActionsReturn => {
  
  // Bug Module 8B: Get session helpers
  const { setSessionData } = useSupabaseSessionHelpers();

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, redirectUrl }: { email: string; password: string; redirectUrl?: string }) => {
      const { data, error } = await supabaseAnon.auth.signUp({ 
        email: email.trim(), 
        password,
        options: redirectUrl ? {
          emailRedirectTo: redirectUrl
        } : undefined
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (data) => {
      return data;
    },
  });

  // Sign in with password mutation
  const signInWithPasswordMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabaseAnon.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Bug Module 8B: Immediately update global session
      if (data.session) {
        setSessionData(data.session);
        
        // Merge will be handled by global listener
      }
      
      return data;
    },
  });

  // Sign in with OTP mutation
  const signInWithOtpMutation = useMutation({
    mutationFn: async ({ email, redirectUrl }: { email: string; redirectUrl?: string }) => {
      const { data, error } = await supabaseAnon.auth.signInWithOtp({
        email: email.trim(),
        options: redirectUrl ? {
          emailRedirectTo: redirectUrl
        } : undefined
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (data) => {
      return data;
    },
  });

  // Computed state
  const isLoading = signUpMutation.isPending || signInWithPasswordMutation.isPending || signInWithOtpMutation.isPending;
  const error = signUpMutation.error?.message || signInWithPasswordMutation.error?.message || signInWithOtpMutation.error?.message || null;
  
  // For email confirmation requirements (typically from sign up)
  const requiresConfirmation = (signUpMutation.isSuccess && !signUpMutation.data?.session) || signInWithOtpMutation.isSuccess;

  return {
    isLoading,
    error,
    requiresConfirmation,
    signUp: (email: string, password: string, redirectUrl?: string) => signUpMutation.mutate({ email, password, redirectUrl }),
    signInWithPassword: (email: string, password: string) => signInWithPasswordMutation.mutate({ email, password }),
    signInWithOtp: (email: string, redirectUrl?: string) => signInWithOtpMutation.mutate({ email, redirectUrl }),
  };
}; 
