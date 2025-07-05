// DASHBOARD UI SHELL — UI/UX PRESERVED WITH DUMMY DATA ONLY
// --------------------------------------------------------------------
// This rebuild maintains all original classNames, layout, and structure.
// All Supabase data has been replaced with static placeholder content only.

import Layout from '../components/Layout';
import Section from '../components/Section';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { useOrders, useSubscriptions } from '../lib/queries/stripeQueries';
import { useCartStore } from '../store/cartStore';

export default function Dashboard() {
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = { email: 'mockuser@example.com' };
  
  // SMU 4.2: Use TanStack Query hooks for orders and subscriptions
  const { data: orders = [] } = useOrders();
  const { data: subs = [] } = useSubscriptions();
  
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
              <p className="text-text-secondary">Welcome back, {user.email}</p>
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
                    {subs.map((sub) => {
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
                    })}
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
                    {orders.map((order) => (
                      <div key={order.id} className="border border-neutral-border rounded-lg p-3">
                        <div className="text-text-primary font-medium">Order #{order.stripe_payment_intent_id?.slice(-8)}</div>
                        <div className="text-xs text-text-tertiary mt-1">
                          {formatDate(order.created_at)} • {formatCurrency(order.amount)}
                        </div>
                      </div>
                    ))}
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