// DASHBOARD UI SHELL — UI/UX PRESERVED WITH DUMMY DATA ONLY
// --------------------------------------------------------------------
// This rebuild maintains all original classNames, layout, and structure.
// All Supabase data has been replaced with static placeholder content only.

import Layout from '../components/Layout';
import Section from '../components/Section';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseSession, useSupabaseSessionHelpers } from '../lib/queries/sessionQueries';
import { useOrders, useSubscriptions } from '../lib/queries/stripeQueries';
import { useCartStore } from '../store/cartStore';
import { openAuthModal, updateCachedCredentials } from '../store/authModalStore';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { supabaseAnon } from '../lib/supabaseClient';
import { useMutation } from '@tanstack/react-query';

// SMU 4.3c: User profile response interface
interface UserProfileResponse {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  stripe_customer_id: string | null;
}

// SMU 4.3c: User profile data fetching
const fetchUserProfile = async (session: any, sessionExpiryHandler?: () => Promise<boolean>): Promise<UserProfileResponse> => {
  if (!session?.user?.id) {
    throw new Error('No user session provided');
  }

  const response = await fetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    // Handle session expiry (401/403 errors)
    if ((response.status === 401 || response.status === 403) && sessionExpiryHandler) {
      const refreshed = await sessionExpiryHandler();
      if (refreshed) {
        // Retry the request with the refreshed session
        return fetchUserProfile(session, sessionExpiryHandler);
      }
    }
    throw new Error('Failed to fetch user profile');
  }

  const profileData = await response.json();
  
  return profileData;
};

export default function Dashboard() {
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const router = useRouter();
  const queryClient = useQueryClient();

  // SMU 4.3c: Use centralized session query
  const sessionQuery = useSupabaseSession();
  const { handleExpiredSession } = useSupabaseSessionHelpers();
  const userSession = sessionQuery.data;

  // UxAuth 1: Get visitor context for email prefilling
  const { visitorData } = useVisitor();

  // SMU 4.3c: User profile query for authenticated users
  const userProfileQuery = useQuery({
    queryKey: ['userProfile', userSession?.user?.id],
    queryFn: () => fetchUserProfile(userSession, handleExpiredSession),
    enabled: !!userSession?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors - they're handled by session expiry logic
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // SMU 4.3c: Derive user object from session and profile data
  const user = userSession ? {
    id: userSession.user.id,
    email: userSession.user.email || userProfileQuery.data?.email || '',
    name: userProfileQuery.data?.name || userSession.user.user_metadata?.name || '',
    stripeCustomerId: userProfileQuery.data?.stripe_customer_id || null
  } : null;

  // SMU 4.3c: Console logging for user identification and authentication
  useEffect(() => {
    // Track user authentication state without logging
  }, [userSession, user, visitorData?.email]);

  // SMU 4.3c: Use TanStack Query hooks with customer ID
  const { data: orders = [] } = useOrders(user?.stripeCustomerId || undefined);
  const { data: subs = [] } = useSubscriptions(user?.stripeCustomerId || undefined);

  // SMU 4.3c: Console logging for Stripe history loading
  useEffect(() => {
    // Track Stripe history loading without logging
  }, [user?.stripeCustomerId, orders, subs]);

  // SMU 4.3d: Cache invalidation when user changes
  const prevCustomerIdRef = useRef<string | null | undefined>(undefined);
  
  useEffect(() => {
    const currentCustomerId = user?.stripeCustomerId;
    const prevCustomerId = prevCustomerIdRef.current;
    
    // Only invalidate if the customer ID has actually changed (not on initial load)
    if (prevCustomerId !== undefined && prevCustomerId !== currentCustomerId) {
      queryClient.invalidateQueries({ queryKey: ['orders'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'], exact: false });
    }
    
    // Update the ref with the current customer ID
    prevCustomerIdRef.current = currentCustomerId;
  }, [user?.stripeCustomerId, queryClient]);
  
  // Get cart clear function
  const clearCart = useCartStore((state) => state.clearCart);

  // Password update mutation
  const passwordUpdateMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabaseAnon.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      setPasswordUpdateStatus('success');
      
      // Cache the new password for future auto-login prompts
      if (user?.email) {
        updateCachedCredentials(user.email, newPassword);
      }
      
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordUpdateStatus('idle'), 3000);
    },
    onError: (error: any) => {
      setPasswordUpdateStatus('error');
      setTimeout(() => setPasswordUpdateStatus('idle'), 3000);
    },
  });

  // Module D: Customer portal session mutation
  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      if (!user?.stripeCustomerId) {
        throw new Error('No Stripe customer ID available');
      }

      const response = await fetch('/api/createCustomerPortalSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stripeCustomerId: user.stripeCustomerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Redirect to customer portal
      window.location.href = data.url;
    },
    onError: (error: any) => {
      // Customer portal creation failed
    },
  });

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword.trim()) {
      alert('Please enter a password');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    passwordUpdateMutation.mutate(newPassword);
  };

  // Sign out functionality
  const handleSignOut = async () => {
    try {
      // Clear all user-specific caches
      queryClient.clear();
      
      // Clear cart
      clearCart();
      
      // Sign out from Supabase
      await supabaseAnon.auth.signOut();
      
      // Redirect to home page
      router.push('/');
      
    } catch (error) {
      // Sign out failed
    }
  };

  // Handle success/cancel query parameters
  useEffect(() => {
    const { success, canceled } = router.query;
    
    if (success === '1') {
      // Clear the cart with a small delay to let webhook clear database first
      console.log('🎯 [Dashboard] Clearing cart after successful purchase');
      
      // Small delay to allow webhook to clear database first
      setTimeout(() => {
        clearCart();
        
        // Invalidate visitor query to force fresh fetch
        queryClient.invalidateQueries({ queryKey: ['visitor'], exact: false });
      }, 1000);
      
      // Invalidate and refetch orders and subscriptions
      queryClient.invalidateQueries({ queryKey: ['orders'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'], exact: false });
      
      // Remove query parameter from URL
      router.replace('/dashboard', undefined, { shallow: true });
    } else if (canceled === '1') {
      // Remove query parameter from URL
      router.replace('/dashboard', undefined, { shallow: true });
    }
  }, [router.query, clearCart, queryClient, router]);

  // Module D: Handle returning from customer portal
  useEffect(() => {
    // Check if we just returned from customer portal (no specific query param needed)
    // Always invalidate subscription data when dashboard loads to ensure fresh data
    if (user?.stripeCustomerId && router.isReady) {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'], exact: false });
    }
  }, [user?.stripeCustomerId, router.isReady, queryClient]);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const formatCurrency = (amount: number) => `$${(amount / 100).toFixed(2)}`;

  const formatSubscriptionStatus = (sub: any) => {
    const status = sub.status?.toLowerCase() || 'unknown';
    const statusColors: { [key: string]: { bg: string; text: string; label: string } } = {
      'active': { bg: 'bg-semantic-success/10', text: 'text-semantic-success', label: 'Active' },
      'trialing': { bg: 'bg-semantic-info/10', text: 'text-semantic-info', label: 'Trial' },
      'past_due': { bg: 'bg-semantic-warning/10', text: 'text-semantic-warning', label: 'Past Due' },
      'canceled': { bg: 'bg-neutral-muted-bg', text: 'text-text-tertiary', label: 'Canceled' },
      'unpaid': { bg: 'bg-semantic-error/10', text: 'text-semantic-error', label: 'Unpaid' },
      'incomplete': { bg: 'bg-semantic-warning/10', text: 'text-semantic-warning', label: 'Incomplete' },
      'incomplete_expired': { bg: 'bg-semantic-error/10', text: 'text-semantic-error', label: 'Expired' }
    };
    return statusColors[status] || { bg: 'bg-neutral-muted-bg', text: 'text-text-tertiary', label: 'Unknown' };
  };

  // SMU 4.3c: Handle visitor mode - show login invitation instead of dashboard
  if (!userSession) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col justify-between site-section-bg">
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="max-w-md w-full mx-4">
              <div className="bg-surface border border-neutral-border rounded-lg p-8 text-center">
                <h1 className="text-heading-lg font-semibold text-text-primary mb-4">Access Your Dashboard</h1>
                <p className="text-text-secondary mb-6">
                  Sign in to view your orders, subscriptions, and account information.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => openAuthModal(visitorData?.email || undefined, undefined, 'signin')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => openAuthModal(visitorData?.email || undefined, undefined, 'signup')}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex flex-col justify-between site-section-bg">
        <div className="flex-1 flex items-start justify-center py-8">
          <div className="max-w-4xl w-full mx-4">
            <div className="bg-surface border border-neutral-border rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-heading-lg font-semibold text-text-primary">Dashboard</h1>
                <button 
                  onClick={handleSignOut}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Sign out
                </button>
              </div>
              <p className="text-text-secondary">Welcome back, {user?.email}</p>
            </div>

            {/* Account Settings Section */}
            <div className="bg-surface border border-neutral-border rounded-lg p-6 mb-6">
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className="w-full flex items-center justify-between py-2 px-0 text-left transition-all duration-200 hover:-translate-y-0.5 rounded border border-neutral-border"
              >
                <span className="text-heading-sm font-medium text-text-primary">
                  Account Settings
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform text-text-secondary ${settingsExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {settingsExpanded && (
                <div className="mt-4 p-4 border border-neutral-border rounded">
                  <div className="max-w-md">
                    <h3 className="text-base font-medium text-text-primary mb-4">Set/Update Password</h3>
                    <p className="text-base text-text-secondary mb-4">
                      {user?.email?.includes('@') ? 
                        "Set a password to use email/password login in addition to magic links." :
                        "Set a password for your account."
                      }
                    </p>
                    
                    <form onSubmit={handlePasswordUpdate} className="space-y-3">
                      <div>
                        <label htmlFor="new-password" className="block text-base font-medium text-text-primary mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="At least 6 characters"
                          disabled={passwordUpdateMutation.isPending}
                          autoComplete="new-password"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="confirm-password" className="block text-base font-medium text-text-primary mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Confirm new password"
                          disabled={passwordUpdateMutation.isPending}
                          autoComplete="new-password"
                        />
                      </div>

                      {/* Status Messages */}
                      {passwordUpdateStatus === 'success' && (
                        <div className="text-green-600 text-base bg-green-50 border border-green-200 rounded px-3 py-2">
                          ✅ Password updated successfully!
                        </div>
                      )}
                      
                      {passwordUpdateStatus === 'error' && (
                        <div className="text-red-600 text-base bg-red-50 border border-red-200 rounded px-3 py-2">
                          ❌ Failed to update password. Please try again.
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={passwordUpdateMutation.isPending || !newPassword.trim() || !confirmPassword.trim()}
                      >
                        {passwordUpdateMutation.isPending ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface border border-neutral-border rounded-lg p-6">
              <button
                onClick={() => setSubsExpanded(!subsExpanded)}
                className="w-full flex items-center justify-between py-2 px-0 text-left transition-all duration-200 hover:-translate-y-0.5 rounded border border-neutral-border"
              >
                <span className="text-heading-sm font-medium text-text-primary">
                  Subscriptions ({subs.length})
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform text-text-secondary ${subsExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {subsExpanded && (
                <div className="mt-2 max-h-80 overflow-y-auto bg-surface border border-neutral-border rounded">
                  <div className="space-y-4 p-4">
                    {/* Module D: Manage Subscription button - only show if user has Stripe customer ID */}
                    {user?.stripeCustomerId && (
                      <div className="border-b border-neutral-border pb-4 mb-4">
                        <button
                          onClick={() => customerPortalMutation.mutate()}
                          disabled={customerPortalMutation.isPending}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {customerPortalMutation.isPending ? 'Opening portal...' : 'Manage Subscription'}
                        </button>
                        <p className="text-base text-text-secondary mt-2">
                          Manage your subscription, update payment methods, and view billing history.
                        </p>
                      </div>
                    )}
                    
                    {subs.length === 0 ? (
                      <div className="text-center py-8 text-text-secondary">
                        <p>No subscription history found.</p>
                      </div>
                    ) : (
                      subs.map((sub) => {
                      const statusInfo = formatSubscriptionStatus(sub);
                      return (
                        <div 
                          key={sub.id} 
                          className="border border-neutral-border rounded-lg p-3 mb-2 relative"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-text-primary font-medium">
                                Subscription {sub.stripe_subscription_id?.slice(-8)}
                              </div>
                              <div className="text-base text-text-secondary space-y-1">
                                <div>Amount: {formatCurrency(sub.amount)}</div>
                                <div>Started: {formatDate(sub.created_at)}</div>
                                {sub.current_period_end && <div>Next billing: {formatDate(sub.current_period_end)}</div>}
                                {sub.canceled_at && <div>Canceled: {formatDate(sub.canceled_at)}</div>}
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-base ${statusInfo.bg} ${statusInfo.text}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface border border-neutral-border rounded-lg p-6">
              <button
                onClick={() => setOrdersExpanded(!ordersExpanded)}
                className="w-full flex items-center justify-between py-2 px-0 text-left transition-all duration-200 hover:-translate-y-0.5 rounded border border-neutral-border"
              >
                <span className="text-heading-sm font-medium text-text-primary">
                  Orders ({orders.length})
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform text-text-secondary ${ordersExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {ordersExpanded && (
                <div className="mt-2 max-h-80 overflow-y-auto bg-surface border border-neutral-border rounded">
                  <div className="space-y-2 p-4">
                    {orders.length === 0 ? (
                      <div className="text-center py-8 text-text-secondary">
                        <p>No order history found.</p>
                      </div>
                    ) : (
                      orders.map((order) => (
                      <div key={order.id} className="border border-neutral-border rounded-lg p-3">
                        <div className="text-text-primary font-medium">Order #{order.stripe_payment_intent_id?.slice(-8)}</div>
                        <div className="text-base text-text-tertiary mt-1">
                          {formatDate(order.created_at)} • {formatCurrency(order.amount)}
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}