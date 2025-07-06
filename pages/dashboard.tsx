// DASHBOARD UI SHELL — UI/UX PRESERVED WITH DUMMY DATA ONLY
// --------------------------------------------------------------------
// This rebuild maintains all original classNames, layout, and structure.
// All Supabase data has been replaced with static placeholder content only.

import Layout from '../components/Layout';
import Section from '../components/Section';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseSession, useSupabaseSessionHelpers } from '../lib/queries/sessionQueries';
import { useOrders, useSubscriptions } from '../lib/queries/stripeQueries';
import { useCartStore } from '../store/cartStore';
import { openAuthModal } from '../store/authModalStore';

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
      console.log('⏰ User session expired — prompting re-auth');
      const refreshed = await sessionExpiryHandler();
      if (refreshed) {
        // Retry the request with the refreshed session
        return fetchUserProfile(session, sessionExpiryHandler);
      }
    }
    throw new Error('Failed to fetch user profile');
  }

  const profileData = await response.json();
  
  // SMU 4.3c: Log the Stripe customer ID from client
  console.log('🔄 SMU 4.3c: Stripe customer ID loaded in dashboard:', profileData.stripe_customer_id);
  
  return profileData;
};

export default function Dashboard() {
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // SMU 4.3c: Use centralized session query
  const sessionQuery = useSupabaseSession();
  const { handleExpiredSession } = useSupabaseSessionHelpers();
  const userSession = sessionQuery.data;

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
    if (userSession && user) {
      console.log('🔄 SMU 4.3c: User identified as authenticated:', {
        userId: user.id,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId
      });
    } else {
      console.log('🔄 SMU 4.3c: User in visitor mode - not authenticated');
    }
  }, [userSession, user]);

  // SMU 4.3c: Use TanStack Query hooks with customer ID
  const { data: orders = [] } = useOrders(user?.stripeCustomerId || undefined);
  const { data: subs = [] } = useSubscriptions(user?.stripeCustomerId || undefined);

  // SMU 4.3c: Console logging for Stripe history loading
  useEffect(() => {
    if (user?.stripeCustomerId) {
      console.log('🔄 SMU 4.3c: Loading Stripe history for customer:', user.stripeCustomerId);
      console.log('🔄 SMU 4.3c: Orders loaded:', orders.length);
      console.log('🔄 SMU 4.3c: Subscriptions loaded:', subs.length);
    }
  }, [user?.stripeCustomerId, orders, subs]);
  
  // Get cart clear function
  const clearCart = useCartStore((state) => state.clearCart);

  // Handle success/cancel query parameters
  useEffect(() => {
    const { success, canceled } = router.query;
    
    if (success === '1') {
      // Clear the cart
      clearCart();
      
      // Invalidate and refetch orders and subscriptions
      queryClient.invalidateQueries({ queryKey: ['orders'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'], exact: false });
      
      // Log success
      console.log('🏁 Checkout result: success');
      
      // Remove query parameter from URL
      router.replace('/dashboard', undefined, { shallow: true });
    } else if (canceled === '1') {
      // Log cancellation
      console.log('🏁 Checkout result: canceled');
      
      // Remove query parameter from URL
      router.replace('/dashboard', undefined, { shallow: true });
    }
  }, [router.query, clearCart, queryClient, router]);

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
                    onClick={() => openAuthModal()}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => openAuthModal()}
                    className="w-full border border-neutral-border bg-surface text-text-primary py-2 px-4 rounded-lg hover:bg-neutral-muted-bg transition-colors"
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
                <button className="text-text-secondary hover:text-text-primary transition-colors">Sign out</button>
              </div>
              <p className="text-text-secondary">Welcome back, {user?.email}</p>
            </div>

            <div className="bg-surface border border-neutral-border rounded-lg p-6 mb-6">
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
                                <div className="text-sm text-text-secondary space-y-1">
                                  <div>Amount: {formatCurrency(sub.amount)}</div>
                                  <div>Started: {formatDate(sub.created_at)}</div>
                                  {sub.current_period_end && <div>Next billing: {formatDate(sub.current_period_end)}</div>}
                                  {sub.canceled_at && <div>Canceled: {formatDate(sub.canceled_at)}</div>}
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${statusInfo.bg} ${statusInfo.text}`}>
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
                          <div className="text-xs text-text-tertiary mt-1">
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