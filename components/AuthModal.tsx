import React, { useState, useEffect } from 'react';
import { useAuthModalState, closeAuthModal, updateCachedCredentials, setAuthModalMode } from '../store/authModalStore';
import { useAuthActions } from '../lib/hooks/useAuthActions';
import { useSupabaseSession } from '../lib/queries/sessionQueries';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { LOG_ENABLED, log } from '../lib/utils/log';

// Module 7: Magic Link Sent subcomponent
interface MagicLinkSentViewProps {
  email: string;
  onClose: () => void;
}

const MagicLinkSentView: React.FC<MagicLinkSentViewProps> = ({ email, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" onClick={onClose} />
    <div className="relative bg-surface rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95 border border-neutral-border">
      <div className="px-4 py-6 text-center">
        <div className="text-semantic-success mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Check your email</h3>
        <p className="text-base text-text-secondary mb-4">
          We've sent a magic link to <strong>{email}</strong>. Click the link to sign in and continue.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-brand-secondary text-white rounded-md hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-colors text-base font-medium"
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
    <div className="relative bg-surface rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95 border border-neutral-border">
      <div className="px-4 py-6 text-center">
        <div className="text-semantic-warning mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Confirm your email</h3>
        <p className="text-base text-text-secondary mb-4">
          We've sent a confirmation email to <strong>{email}</strong>. Please click the link in the email to verify your account and continue.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-brand-secondary text-white rounded-md hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-colors text-base font-medium"
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
  
  // Use mode from store instead of local state
  const isSignUp = modalState.mode === 'signup';
  
  // Bug Module 8A: Track sign-up email confirmation state
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');

  // Module 7: Use auth actions hook for state only
  const authActions = useAuthActions();

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
      if (LOG_ENABLED) {
        log('[Modal Debug] Modal opened with prefilled email:', modalState.email);
      }
    }
  }, [modalState.isOpen, modalState.email, modalState.password]);

  // Bug Module 8A: Handle email confirmation requirement
  useEffect(() => {
    if (authActions.requiresConfirmation && !awaitingEmailConfirmation) {
      setAwaitingEmailConfirmation(true);
      setSignUpEmail(modalState.email || email);
      if (LOG_ENABLED) {
        log('📧 Bug 8A: Email confirmation required – merge paused');
      }
    }
  }, [authActions.requiresConfirmation, awaitingEmailConfirmation, modalState.email, email]);

  // Bug Module 8A: Monitor session changes after email confirmation
  useEffect(() => {
    if (awaitingEmailConfirmation && sessionQuery.data && visitorId) {
      if (LOG_ENABLED) {
        log('✅ Bug 8A: Session verified after email confirmation – waiting for global merge');
      }
      
      // Global listener will handle the merge
      
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

  // Bug Module 8B: Handle completion for password sign-in
  useEffect(() => {
    if (!authActions.isLoading && !authActions.requiresConfirmation && !awaitingEmailConfirmation && !authActions.error && sessionQuery.data) {
      if (LOG_ENABLED) {
        log('✅ Bug 8B: Auth completed – closing modal');
      }
      
      // Update cached credentials
      updateCachedCredentials(modalState.email || email, password);
      
      // Close modal and call success handler
      closeAuthModal();
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [authActions.isLoading, authActions.requiresConfirmation, awaitingEmailConfirmation, authActions.error, sessionQuery.data, modalState.email, email, password, onSuccess]);

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
    
    if (LOG_ENABLED) {
      log('🎯 Module 7: Magic link redirect:', redirectUrl);
    }
    authActions.signInWithOtp(emailToUse, redirectUrl);
  };

  // Module 7: Simple password form handler
  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailToUse = modalState.email || email;
    
    if (!emailToUse.trim() || !password.trim()) {
      return;
    }

    if (LOG_ENABLED) {
      log('🎯 Module 7: Password auth attempted');
    }

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

    if (LOG_ENABLED) {
      log('🎯 Bug Module 7A: Auth redirect URL:', redirectUrl);
    }

    // Module 7: Call hook methods directly
    if (isSignUp) {
      authActions.signUp(emailToUse, password, redirectUrl);
    } else {
      authActions.signInWithPassword(emailToUse, password);
    }
  };

  // Module 7: Display hook states only
  const isLoading = authActions.isLoading;
  const error = authActions.error;

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
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" onClick={() => { if (LOG_ENABLED) log('[Modal Debug] Overlay onClick — attempting to close modal'); handleClose(); }} />
      
      <div className="relative bg-surface rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95 border border-neutral-border">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-text-primary">Welcome</h3>
            <button
              onClick={handleClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tab-style toggle */}
          <div className="flex bg-neutral-muted-light rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAuthModalMode('signin')}
              className={`flex-1 py-2 px-3 text-base font-medium rounded-md transition-colors ${
                modalState.mode === 'signin'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              disabled={isLoading}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthModalMode('signup')}
              className={`flex-1 py-2 px-3 text-base font-medium rounded-md transition-colors ${
                modalState.mode === 'signup'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              disabled={isLoading}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-3">
          {/* Magic Link Option */}
          <form onSubmit={handleMagicLink} className="space-y-3 mb-4">
            <div>
              <label htmlFor="magic-email" className="block text-base font-medium text-text-primary mb-1">
                Email address
              </label>
              <input
                type="email"
                id="magic-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary bg-surface text-text-primary placeholder:text-text-muted"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-brand-secondary text-white rounded-md hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-4">
            <div className="border-t border-neutral-border w-full"></div>
            <span className="bg-surface px-3 text-base text-text-secondary">or</span>
            <div className="border-t border-neutral-border w-full"></div>
          </div>

          {/* Email/Password Option */}
          <form onSubmit={handleEmailPassword} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="block text-base font-medium text-text-primary mb-1">
                Email address
              </label>
              <input
                type="email"
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary bg-surface text-text-primary placeholder:text-text-muted"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium text-text-primary mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary bg-surface text-text-primary placeholder:text-text-muted"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-semantic-error text-base bg-semantic-error/10 border border-semantic-error/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-brand-secondary text-white rounded-md hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 
