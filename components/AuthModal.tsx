import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabaseAnon } from '../lib/supabaseClient';
import { useAuthModalState, closeAuthModal, updateCachedCredentials } from '../store/authModalStore';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { useSupabaseSessionHelpers } from '../lib/queries/sessionQueries';

// UxAuth 1: Updated interface - onSuccess now optional since it's handled globally
interface AuthModalProps {
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const modalState = useAuthModalState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  
  // Get visitor context for visitor-user linking
  const { visitorId } = useVisitor();
  
  // Bug 3: Get session helpers for updating cached session
  const { setSessionData } = useSupabaseSessionHelpers();

  // UxAuth 1: Prefill email and password from store when modal opens
  useEffect(() => {
    if (modalState.isOpen) {
      setEmail(modalState.email || '');
      setPassword(modalState.password || '');
      setMagicLinkSent(false);
      setEmailVerificationRequired(false);
      console.log('🔐 UxAuth 1: Modal opened with prefilled data', {
        email: modalState.email ? '***' + modalState.email.slice(-8) : undefined,
        hasPassword: !!modalState.password,
      });
    }
  }, [modalState.isOpen, modalState.email, modalState.password]);

  // UxAuth 1: Handle modal close
  const handleClose = () => {
    closeAuthModal();
  };

  // Bug 3: Direct visitor merge function
  const performVisitorMerge = async () => {
    try {
      if (!visitorId) {
        throw new Error('No visitor ID available for merge');
      }

      const { data: { session } } = await supabaseAnon.auth.getSession();
      if (!session) {
        throw new Error('No active session for merge');
      }

      const response = await fetch('/api/visitor/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ visitor_id: visitorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to merge visitor with user account');
      }

      const data = await response.json();
      console.log('✅ Bug 3: Visitor-user merge successful:', data);
      
      // Update cached credentials and close modal
      updateCachedCredentials(email, password);
      closeAuthModal();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Visitor-user merge failed:', error);
      // Still close modal and update credentials even if merge fails
      updateCachedCredentials(email, password);
      closeAuthModal();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  // Bug 3: Handle success after session is established
  const handleSessionBasedSuccess = async (session: any) => {
    console.log('🔄 Bug 3: Handling session-based success for visitor:', visitorId);
    
    // Bug 3: Defer merge until session exists
    if (!session) {
      console.log('⚠️ Bug 3: No session available yet, waiting for auth state change');
      // The global auth listener will handle the session update
      // For now, close modal if email verification is required
      if (emailVerificationRequired) {
        updateCachedCredentials(email, password);
        closeAuthModal();
        if (onSuccess) {
          onSuccess();
        }
      }
      return;
    }
    
    // Trigger visitor merge to link visitor record to user account
    if (visitorId) {
      console.log('🔄 Bug 3: Session confirmed, triggering visitor merge with data:', { 
        visitorId, 
        userId: session.user?.id 
      });
      // Call visitor merge directly
      performVisitorMerge();
    } else {
      // No visitor ID - just close modal and update credentials
      console.log('⚠️ No visitor ID available - skipping merge');
      updateCachedCredentials(email, password);
      closeAuthModal();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  // State Mgmt Update 1: TanStack mutations for auth flows
  const signInWithOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      // Dynamic redirect - return to current page where modal was opened
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const redirectUrl = `${window.location.origin}${currentPath}${currentSearch}`;
      
      console.log('🔄 Magic link will redirect to:', redirectUrl);
      
      const { error } = await supabaseAnon.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return { success: true };
    },
    onSuccess: () => {
        setMagicLinkSent(true);
        console.log('📧 Magic link sent to:', email);
    },
  });

  const signInWithPasswordMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('🔄 Bug 3: Attempting sign in with password');
      
      const { data, error } = await supabaseAnon.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        // Bug 3: Check for email confirmation requirement
        if (error.message.includes('email_not_confirmed') || error.message.includes('confirm your email')) {
          console.log('📧 Bug 3: Email confirmation required detected');
          setEmailVerificationRequired(true);
        }
        throw new Error(error.message);
      }
      
      console.log('✅ Bug 3: Sign in successful, session data:', { userId: data?.user?.id, sessionExists: !!data?.session });
      
      return { session: data.session, user: data.user };
    },
    onSuccess: (data) => {
      console.log('✅ User sign in successful');
      // Bug 3: Update cached session immediately
      if (data.session) {
        setSessionData(data.session);
        console.log('✅ Bug 3: Updated session cache after sign-in:', { userId: data.session.user?.id });
      }
      // Bug 3: Wait for session to be established before proceeding
      handleSessionBasedSuccess(data.session);
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('🔄 Bug 3: Attempting sign up with password');
      
      const { data, error } = await supabaseAnon.auth.signUp({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('✅ Bug 3: Sign up successful:', { 
        userId: data?.user?.id, 
        sessionExists: !!data?.session,
        emailConfirmed: data?.user?.email_confirmed_at ? true : false 
      });
      
      return { session: data.session, user: data.user };
    },
    onSuccess: (data) => {
      console.log('✅ User sign up successful');
      // Bug 3: Update cached session if available
      if (data.session) {
        setSessionData(data.session);
        console.log('✅ Bug 3: Updated session cache after sign-up:', { userId: data.session.user?.id });
      } else {
        console.log('📧 Bug 3: No immediate session - email confirmation may be required');
        setEmailVerificationRequired(true);
      }
      // Bug 3: Wait for session to be established before proceeding
      handleSessionBasedSuccess(data.session);
    },
  });

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use enforced email from store if provided, otherwise use user-entered email
    const emailToUse = modalState.email || email;
    
    if (!emailToUse.trim()) {
      return;
    }

    signInWithOtpMutation.mutate(emailToUse);
  };

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use enforced email from store if provided, otherwise use user-entered email
    const emailToUse = modalState.email || email;
    
    if (!emailToUse.trim() || !password.trim()) {
      return;
    }

    const mutation = isSignUp ? signUpMutation : signInWithPasswordMutation;
    mutation.mutate({ email: emailToUse, password });
  };

  // Computed states from mutations  
  const isLoading = signInWithOtpMutation.isPending || signInWithPasswordMutation.isPending || signUpMutation.isPending;
  const error = signInWithOtpMutation.error?.message || signInWithPasswordMutation.error?.message || signUpMutation.error?.message;

  // UxAuth 1: Don't render if modal is not open
  if (!modalState.isOpen) {
    return null;
  }

  if (magicLinkSent || emailVerificationRequired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95">
          <div className="px-6 py-8 text-center">
            <div className="text-green-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emailVerificationRequired ? 'Verify your email' : 'Check your email'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {emailVerificationRequired ? (
                <>We've sent a verification link to <strong>{modalState.email || email}</strong>. Please check your email and click the link to verify your account before signing in.</>
              ) : (
                <>We've sent a magic link to <strong>{modalState.email || email}</strong>. Click the link to sign in and continue.</>
              )}
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" onClick={handleClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4">
          {/* Magic Link Option */}
          <form onSubmit={handleMagicLink} className="space-y-4 mb-6">
            <div>
              <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="magic-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-gray-300 w-full"></div>
            <span className="bg-white px-3 text-sm text-gray-500">or</span>
            <div className="border-t border-gray-300 w-full"></div>
          </div>

          {/* Email/Password Option */}
          <form onSubmit={handleEmailPassword} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
              </button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 transition-colors"
                disabled={isLoading}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 