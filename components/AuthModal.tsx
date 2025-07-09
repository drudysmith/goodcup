import React, { useState, useEffect } from 'react';
import { useAuthModalState, closeAuthModal, updateCachedCredentials } from '../store/authModalStore';
import { useAuthActions } from '../lib/hooks/useAuthActions';
import { useVisitorMerge } from '../lib/hooks/useVisitorMerge';
import { useSupabaseSession } from '../lib/queries/sessionQueries';
import { useVisitor } from '../lib/contexts/VisitorContext';

// Module 7: Magic Link Sent subcomponent
interface MagicLinkSentViewProps {
  email: string;
  onClose: () => void;
}

const MagicLinkSentView: React.FC<MagicLinkSentViewProps> = ({ email, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" onClick={onClose} />
    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95">
      <div className="px-6 py-8 text-center">
        <div className="text-green-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
        <p className="text-sm text-gray-500 mb-6">
          We've sent a magic link to <strong>{email}</strong>. Click the link to sign in and continue.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
);

// Bug Module 8A: Email Confirmation subcomponent
interface EmailConfirmationViewProps {
  email: string;
  onClose: () => void;
}

const EmailConfirmationView: React.FC<EmailConfirmationViewProps> = ({ email, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" onClick={onClose} />
    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95">
      <div className="px-6 py-8 text-center">
        <div className="text-orange-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm your email</h3>
        <p className="text-sm text-gray-500 mb-6">
          We've sent a confirmation email to <strong>{email}</strong>. Please click the link in the email to verify your account and continue.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
);

// Updated interface - onSuccess now optional since it's handled globally
interface AuthModalProps {
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const modalState = useAuthModalState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Bug Module 8A: Track sign-up email confirmation state
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');

  // Module 7: Use auth actions hook for state only
  const authActions = useAuthActions();

  // Module 7: Use visitor merge hook for state only  
  const visitorMerge = useVisitorMerge();

  // Bug Module 8A: Monitor global session state
  const sessionQuery = useSupabaseSession();
  const { visitorId } = useVisitor();

  // Module 7: Prefill form fields when modal opens
  useEffect(() => {
    if (modalState.isOpen) {
      setEmail(modalState.email || '');
      setPassword(modalState.password || '');
      // Bug Module 8A: Reset email confirmation state when modal opens
      setAwaitingEmailConfirmation(false);
      setSignUpEmail('');
      console.log('🎯 Module 7: Modal opened with prefilled data', {
        email: modalState.email ? '***' + modalState.email.slice(-8) : undefined,
        hasPassword: !!modalState.password,
      });
    }
  }, [modalState.isOpen, modalState.email, modalState.password]);

  // Bug Module 8A: Handle email confirmation requirement
  useEffect(() => {
    if (authActions.requiresConfirmation && !awaitingEmailConfirmation) {
      setAwaitingEmailConfirmation(true);
      setSignUpEmail(modalState.email || email);
      console.log('📧 Bug 8A: Email confirmation required – merge paused');
    }
  }, [authActions.requiresConfirmation, awaitingEmailConfirmation, modalState.email, email]);

  // Bug Module 8A: Monitor session changes for merge triggering
  useEffect(() => {
    if (awaitingEmailConfirmation && sessionQuery.data && visitorId) {
      console.log('✅ Bug 8A: Session verified after email confirmation – triggering merge');
      
      // Trigger visitor merge with session verification
      visitorMerge.triggerMerge();
      
      // Update cached credentials
      updateCachedCredentials(signUpEmail, password);
      
      // Close modal and call success handler
      closeAuthModal();
      if (onSuccess) {
      onSuccess();
      }
      
      // Reset state
      setAwaitingEmailConfirmation(false);
      setSignUpEmail('');
    }
  }, [awaitingEmailConfirmation, sessionQuery.data, visitorId, signUpEmail, password, onSuccess]);

  // Bug Module 8B: Handle visitor merge completion for password sign-in
  useEffect(() => {
    if (!visitorMerge.isLoading && !authActions.isLoading && !authActions.requiresConfirmation && !awaitingEmailConfirmation && !authActions.error && sessionQuery.data) {
      console.log('✅ Bug 8B: Visitor merge completed – closing modal');
      
      // Update cached credentials
      updateCachedCredentials(modalState.email || email, password);
      
      // Close modal and call success handler
      closeAuthModal();
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [visitorMerge.isLoading, authActions.isLoading, authActions.requiresConfirmation, awaitingEmailConfirmation, authActions.error, sessionQuery.data, modalState.email, email, password, onSuccess]);

  // Module 7: Simple modal close handler
  const handleClose = () => {
    closeAuthModal();
  };

  // Module 7: Simple magic link form handler
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailToUse = modalState.email || email;
    
    if (!emailToUse.trim()) {
      return;
    }

    // Module 7: Dynamic redirect - return to current page where modal was opened
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const redirectUrl = `${window.location.origin}${currentPath}${currentSearch}`;
    
    console.log('🎯 Module 7: Magic link redirect:', redirectUrl);
    authActions.signInWithOtp(emailToUse, redirectUrl);
  };

  // Module 7: Simple password form handler
  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailToUse = modalState.email || email;
    
    if (!emailToUse.trim() || !password.trim()) {
      return;
    }

    console.log('🎯 Module 7: Password auth attempted');

    // Bug Module 7A: Auth redirect - prioritize dashboard paths, fallback to dashboard
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    
    let redirectUrl: string;
    if (currentPath.startsWith('/dashboard')) {
      // First option: Send user back to the same dashboard tab/url that originated the request
      redirectUrl = `${window.location.origin}${currentPath}${currentSearch}`;
    } else {
      // Fallback option: Send user back to the dashboard page
      redirectUrl = `${window.location.origin}/dashboard`;
    }

    console.log('🎯 Bug Module 7A: Auth redirect URL:', redirectUrl);

    // Module 7: Call hook methods directly
    if (isSignUp) {
      authActions.signUp(emailToUse, password, redirectUrl);
    } else {
      authActions.signInWithPassword(emailToUse, password);
    }
  };

  // Module 7: Display hook states only
  const isLoading = authActions.isLoading || visitorMerge.isLoading;
  const error = authActions.error || visitorMerge.error;

  // Module 7: Don't render if modal is not open
  if (!modalState.isOpen) {
    return null;
  }

  // Bug Module 8A: Show email confirmation view for sign-up
  if (awaitingEmailConfirmation) {
    return <EmailConfirmationView email={signUpEmail} onClose={handleClose} />;
  }

  // Module 7: Show magic link sent subcomponent
  if (authActions.requiresConfirmation && !awaitingEmailConfirmation) {
    return <MagicLinkSentView email={modalState.email || email} onClose={handleClose} />;
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