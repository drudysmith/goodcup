// CHECKOUT PAGE — USER-AGNOSTIC, TANSTACK-BASED, STRIPPED DATA LAYER
// --------------------------------------------------------------------------------
// This rebuild:
// - Removes all auth, Supabase, router, and eligibility logic
// - Preserves full UI/UX structure (Information → Shipping → Payment)
// - Uses TanStack Query for products and API operations
// - Uses local customer info state to simulate user identity

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseSession, useSupabaseSessionHelpers, useSessionExpiryMutation } from '../lib/queries/sessionQueries';
import { useCartStore, CartItem } from '../store/cartStore';
import { CheckoutModeToggle } from '../components/CheckoutModeToggle';
import { AuthModal } from '../components/AuthModal';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { supabaseAnon } from '../lib/supabaseClient';

interface StripePrice {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string };
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  prices: StripePrice[];
}

interface CustomerInfo {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

type CheckoutStage = 'information' | 'shipping';

// Query functions
const fetchProducts = async (): Promise<{ products: StripeProduct[] }> => {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
};

const mergeVisitor = async ({ visitorId, accessToken }: { visitorId: string; accessToken: string }) => {
  const response = await fetch('/api/visitor/merge', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visitor_id: visitorId }),
  });

  if (!response.ok) {
    throw new Error('Failed to merge visitor');
  }

  return response.json();
};

const createCheckoutSession = async (payload: {
  items: CartItem[];
  customerEmail: string;
  supabaseUserId?: string;
  visitorId?: string;
  checkoutMode: 'user' | 'guest';
}) => {
  const response = await fetch('/api/createCheckoutSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  return response.json();
};

// Module 6f: Address saving function
const saveAddress = async (address: any, token: string) => {
  const response = await fetch('/api/saveAddress', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    throw new Error('Failed to save address');
  }

  return response.json();
};

// Module 7: User profile data fetching via secure API endpoint (with Module 8 session expiry handling)
const fetchUserProfile = async (session: any, sessionExpiryHandler?: () => Promise<boolean>) => {
  if (!session?.user?.id) {
    throw new Error('No user session provided');
  }

  const response = await fetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    // Module 8: Handle session expiry (401/403 errors)
    if ((response.status === 401 || response.status === 403) && sessionExpiryHandler) {
      console.log('⏰ User session expired — prompting re-auth');
      const refreshed = await sessionExpiryHandler();
      if (refreshed) {
        // Retry the request with the refreshed session
        return fetchUserProfile(session, sessionExpiryHandler);
      }
    }
    console.log('⚠️ No profile data found for user:', session.user.id);
    return null;
  }

  return response.json();
};

export default function Checkout() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const queryClient = useQueryClient();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<CheckoutStage>('information');
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'user' | 'guest'>('user');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isProcessingMerge, setIsProcessingMerge] = useState(false);
  
  // State Mgmt Update 2: Use centralized session query
  const sessionQuery = useSupabaseSession();
  const { setSessionData, handleExpiredSession } = useSupabaseSessionHelpers();
  const userSession = sessionQuery.data;
  
  // Module 8: Session expiry handling
  const sessionExpiryMutation = useSessionExpiryMutation();
  
  // Module 6b.3.1: Inline login state
  const [showInlineLogin, setShowInlineLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLinkSent, setLoginLinkSent] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Module 6c: Guest flow reconciliation state
  const [showGuestConfirmation, setShowGuestConfirmation] = useState(false);

  // Visitor context for guest checkout
  const { visitorId, jwt, visitorData } = useVisitor();

  // Module 6e: Initialize customerInfo with empty defaults
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
  });



  // Module 6b.3.1: Prefill login email from available data
  useEffect(() => {
    const prefillEmail = visitorData?.email || customerInfo.email;
    if (prefillEmail && !loginEmail) {
      setLoginEmail(prefillEmail);
    }
  }, [visitorData?.email, customerInfo.email, loginEmail]);

  // Module 6b.3.1: Confirm inline form display
  useEffect(() => {
    if (showInlineLogin) {
      console.log('✅ Inline login form is now displayed');
      // Reset error state when form is shown
      setLoginError(null);
    }
  }, [showInlineLogin]);

  // Module 6c: Reset guest confirmation when checkout mode changes
  useEffect(() => {
    if (checkoutMode === 'user') {
      setShowGuestConfirmation(false);
    }
  }, [checkoutMode]);

  // Products query
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Module 6e: User profile query for authenticated users (with Module 8 session expiry handling)
  const userProfileQuery = useQuery({
    queryKey: ['userProfile', userSession?.user?.id],
    queryFn: () => fetchUserProfile(userSession, handleExpiredSession),
    enabled: !!userSession?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Module 8: Don't retry on auth errors - they're handled by session expiry logic
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Module 6e: Prefill customerInfo from available data
  useEffect(() => {
    const profileData = userProfileQuery.data;
    
    if (userSession && profileData) {
      // Prefill from user profile data
      console.log('🔄 Module 6e: Prefilling checkout fields from user profile');
      const nameParts = profileData.name ? profileData.name.split(' ') : ['', ''];
      setCustomerInfo({
        email: userSession.user.email || profileData.email || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        address: profileData.street || '',
        apartment: profileData.unit || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zipCode: profileData.postal_code || '',
        country: profileData.country || '',
        phone: profileData.phone || '',
      });
    } else if (visitorData && !userSession) {
      // Prefill from visitor data
      console.log('🔄 Module 6e: Prefilling checkout fields from visitor data');
      const nameParts = visitorData.name ? visitorData.name.split(' ') : ['', ''];
      setCustomerInfo(prev => ({
        ...prev,
        email: visitorData.email || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: visitorData.phone || '',
        // Module 6e.3: Include address fields from visitor data
        address: visitorData.street || '',
        apartment: visitorData.unit || '',
        city: visitorData.city || '',
        state: visitorData.state || '',
        zipCode: visitorData.postal_code || '',
        country: visitorData.country || '',
      }));
    }
  }, [userSession, userProfileQuery.data, visitorData]);

  // Visitor merge mutation
  const visitorMergeMutation = useMutation({
    mutationFn: mergeVisitor,
    onSuccess: (mergeData) => {
      console.log('✅ Module 6b.2: Visitor merge successful:', mergeData);
      
      // Clear visitor tokens from localStorage
      console.log('🧹 Module 6b.2: Clearing visitor tokens from localStorage');
      localStorage.removeItem('visitor_id');
      localStorage.removeItem('visitor_jwt');
    },
    onError: (error) => {
      console.error('Module 6b.2: Visitor merge failed:', error);
      alert('Failed to merge visitor data. Please try again.');
    },
  });

  // Checkout session mutation
  const checkoutSessionMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (checkoutData) => {
      if (checkoutData.url) {
        console.log('✅ Module 6d: Checkout session finalized — redirecting to Stripe');
        console.log('✅ Redirecting to Stripe checkout session');
        window.location.href = checkoutData.url;
      } else {
        console.error('Checkout session creation failed:', checkoutData.error);
        alert(checkoutData.error || 'Checkout failed');
      }
    },
    onError: (error) => {
      console.error('Error creating checkout session:', error);
      alert('Checkout failed');
    },
  });

  // Module 6f: Address saving mutation
  const saveAddressMutation = useMutation({
    mutationFn: ({ address, token }: { address: any; token: string }) => saveAddress(address, token),
    onSuccess: (data) => {
      console.log('✅ Module 6f: Address saved successfully:', data);
      // Invalidate visitor query to refresh data with saved address
      queryClient.invalidateQueries({ queryKey: ['visitor', visitorId] });
      if (userSession) {
        // Also invalidate user profile if authenticated
        queryClient.invalidateQueries({ queryKey: ['userProfile', userSession.user.id] });
      }
    },
    onError: (error) => {
      console.error('Module 6f: Error saving address:', error);
      alert('Failed to save address. Please try again.');
    },
  });

  // State Mgmt Update 2: Setup auth state change listener
  useEffect(() => {
    // Listen for auth state changes and update query cache
    const { data: { subscription } } = supabaseAnon.auth.onAuthStateChange(async (event, session) => {
      setSessionData(session);
      if (event === 'SIGNED_IN' && session && checkoutMode === 'user' && visitorId && !isProcessingMerge) {
        console.log('✅ User authentication successful');
        setShowAuthModal(false);
        setShowInlineLogin(false);
        
        // Module 6b.2: Post-Merge Cleanup and Checkout
        setIsProcessingMerge(true);
        setCheckoutLoading(true);
        
        try {
          console.log('🔄 Module 6b.2: Merging visitor with authenticated user');
          
          // Call merge mutation
          const mergeData = await visitorMergeMutation.mutateAsync({
            visitorId,
            accessToken: session.access_token,
          });
          
          // Create checkout session with user ID
          console.log('🔄 Module 6b.2: Creating Stripe checkout session with user ID:', session.user.id);
          
          await checkoutSessionMutation.mutateAsync({
            items,
            customerEmail: session.user.email || customerInfo.email,
            supabaseUserId: session.user.id,
            checkoutMode: 'user'
          });
        } catch (error) {
          console.error('Module 6b.2: Error during merge and checkout:', error);
          alert('An error occurred during checkout. Please try again.');
        } finally {
          setIsProcessingMerge(false);
          setCheckoutLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [checkoutMode, visitorId, isProcessingMerge, items, customerInfo.email, setSessionData, visitorMergeMutation, checkoutSessionMutation]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === '1') {
        clearCart();
      }
      // Set checkout mode from URL parameter
      const modeParam = params.get('mode');
      if (modeParam === 'guest' || modeParam === 'user') {
        setCheckoutMode(modeParam);
      }
    }
  }, [clearCart]);

  const getProductAndPrice = (item: CartItem) => {
    const products = productsQuery.data?.products || [];
    const product = products.find((p) => p.id === item.productId);
    const price = product?.prices.find((pr) => pr.id === item.priceId);
    return { product, price };
  };

  const cartTotal = items.reduce((sum, item) => {
    const { price } = getProductAndPrice(item);
    return sum + ((price?.unit_amount || 0) * item.quantity);
  }, 0);

  const validateInformationStage = () => {
    return customerInfo.email && customerInfo.firstName && customerInfo.lastName && customerInfo.address && customerInfo.city && customerInfo.state && customerInfo.zipCode;
  };

  const handleContinueToShipping = async () => {
    if (!validateInformationStage()) {
      return;
    }

    // Module 6f: Save address before proceeding to shipping
    console.log('📍 Module 6f: Saving address information');
    
    const addressPayload = {
      street: customerInfo.address,
      unit: customerInfo.apartment || '',
      city: customerInfo.city,
      state: customerInfo.state,
      postal_code: customerInfo.zipCode,
      country: customerInfo.country,
    };

    try {
      // Determine which token to use
      const token = userSession?.access_token || jwt;
      
      if (!token) {
        console.error('⚠️ Module 6f: No authentication token available');
        alert('Authentication required to save address');
        return;
      }

      await saveAddressMutation.mutateAsync({ address: addressPayload, token });
      
      // Proceed to shipping stage after successful save
      setCurrentStage('shipping');
    } catch (error) {
      console.error('Module 6f: Failed to save address:', error);
      // Still allow proceeding to shipping even if save fails
      setCurrentStage('shipping');
    }
  };

  const handleReturnToInformation = () => {
    setCurrentStage('information');
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    
    if (checkoutMode === 'user') {
      // Module 5: User Auth Trigger
      if (userSession) {
        // Module 6a: Session Short-Circuit
        console.log('✅ User already authed — skipping sign-in flow');
        console.log('🔄 Module 6a: Creating Stripe checkout session with user ID:', userSession.user.id);
        
        try {
          await checkoutSessionMutation.mutateAsync({
            items,
            customerEmail: userSession.user.email || customerInfo.email,
            supabaseUserId: userSession.user.id,
            checkoutMode: 'user'
          });
        } finally {
          setCheckoutLoading(false);
        }
        return;
      } else {
        // User not signed in - show inline login
        console.log('🔐 User opted for full auth — will display inline login form');
        setShowInlineLogin(true);
        setCheckoutLoading(false);
        return;
      }
    }

    // Module 6c: Guest Flow Reconciliation
    const hasVisitorContactInfo = visitorData?.email || visitorData?.name || visitorData?.phone;
    
    if (hasVisitorContactInfo && !showGuestConfirmation) {
      // Show confirmation dialog for guests with saved contact info
      console.log('🧭 Guest checkout with saved contact info — showing confirmation dialog');
      setShowGuestConfirmation(true);
      setCheckoutLoading(false);
      return;
    }

    // Guest checkout flow using visitor context
    try {
      console.log('🧭 Proceeding with guest checkout');
      await checkoutSessionMutation.mutateAsync({
        items,
        customerEmail: visitorData?.email || customerInfo.email,
        visitorId: visitorId || undefined,
        checkoutMode: 'guest'
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (productsQuery.isLoading) return <div className="text-center py-16">Loading...</div>;
  if (productsQuery.isError) return <div className="text-center py-16">Error loading products</div>;
  if (items.length === 0) return <div className="text-center py-16">Your cart is empty</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {/* Order Summary Toggle (Mobile) */}
          <div className="lg:hidden mb-4">
            <button onClick={() => setOrderSummaryExpanded(!orderSummaryExpanded)} className="w-full flex justify-between p-4 border rounded">
              <span>{orderSummaryExpanded ? 'Hide order summary' : 'Show order summary'}</span>
              <span>${(cartTotal / 100).toFixed(2)}</span>
            </button>
            {orderSummaryExpanded && (
              <div className="mt-4 space-y-4">
                {items.map((item) => {
                  const { product, price } = getProductAndPrice(item);
                  if (!product || !price) return null;
                  return (
                    <div key={item.priceId} className="flex justify-between border p-2 rounded">
                      <div>{product.name}</div>
                      <div>${((price.unit_amount || 0) * item.quantity / 100).toFixed(2)}</div>
                    </div>
                  );
                })}
                <div className="text-right font-bold">Total: ${(cartTotal / 100).toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-text-secondary">
            Information › Shipping › Payment
          </div>

          {/* Stage: Information */}
          {currentStage === 'information' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Contact</h2>
              <input type="email" placeholder="Email" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} className="w-full p-3 border rounded" />
              <h3 className="text-xl font-bold mt-6">Shipping Address</h3>
              <input type="text" placeholder="First name" value={customerInfo.firstName} onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="Last name" value={customerInfo.lastName} onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="Address" value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="City" value={customerInfo.city} onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="State" value={customerInfo.state} onChange={(e) => setCustomerInfo({ ...customerInfo, state: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="ZIP code" value={customerInfo.zipCode} onChange={(e) => setCustomerInfo({ ...customerInfo, zipCode: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="Country" value={customerInfo.country} onChange={(e) => setCustomerInfo({ ...customerInfo, country: e.target.value })} className="w-full p-3 border rounded" />
              <button onClick={handleContinueToShipping} className="w-full bg-brand-secondary text-white py-3 px-6 rounded disabled:opacity-50" disabled={!validateInformationStage() || saveAddressMutation.isPending}>
                {saveAddressMutation.isPending ? 'Saving address...' : 'Continue to shipping'}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="text-sm text-brand-secondary hover:underline"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Stage: Shipping */}
          {currentStage === 'shipping' && (
            <div className="space-y-6">
              <div className="border p-4 rounded">
                <div className="mb-2 text-sm text-text-secondary">Contact</div>
                <div className="font-medium">{customerInfo.email}</div>
              </div>
              <div className="border p-4 rounded">
                <div className="mb-2 text-sm text-text-secondary">Shipping to</div>
                <div className="font-medium">
                  {customerInfo.address}, {customerInfo.city}, {customerInfo.state} {customerInfo.zipCode}, {customerInfo.country}
                </div>
              </div>
              {/* Checkout Mode Toggle */}
              <div className="mb-4">
                <CheckoutModeToggle
                  onModeChange={setCheckoutMode}
                  defaultMode={checkoutMode}
                  className=""
                />
              </div>

              <button onClick={handleCheckout} disabled={checkoutLoading} className="w-full bg-brand-secondary text-white py-3 px-6 rounded disabled:opacity-50">
                {checkoutLoading ? 'Processing...' : 
                  checkoutMode === 'user' ? 'Continue to sign in' : 'Continue to payment'
                }
              </button>

              {/* Module 6b.3.1 & 6b.3.2: Inline Login Form */}
              {checkoutMode === 'user' && !userSession && showInlineLogin && (
                <div className="mt-4 p-4 border rounded bg-gray-50">
                  {!loginLinkSent ? (
                    <form 
                      onSubmit={async (e: React.FormEvent) => {
                        e.preventDefault();
                        
                        if (!loginEmail.trim()) {
                          setLoginError('Email is required');
                          return;
                        }

                        setLoginLoading(true);
                        setLoginError(null);

                        try {
                          // Use original prefilled email if available, otherwise use current input
                          const emailToUse = (visitorData?.email || customerInfo.email) || loginEmail;
                          const { error } = await supabaseAnon.auth.signInWithOtp({
                            email: emailToUse.trim(),
                            options: {
                              emailRedirectTo: `${window.location.origin}/checkout?mode=user`
                            }
                          });

                          if (error) {
                            setLoginError(error.message);
                          } else {
                            setLoginLinkSent(true);
                            console.log('📧 Magic link sent to:', emailToUse);
                          }
                        } catch (err) {
                          setLoginError('Failed to send magic link');
                        } finally {
                          setLoginLoading(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <h4 className="text-sm font-medium text-gray-700">Sign in to your account</h4>
                      
                      <div>
                        <label htmlFor="inline-email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email address
                        </label>
                        <input
                          type="email"
                          id="inline-email"
                          placeholder="your@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          disabled={loginLoading}
                          readOnly={!!(visitorData?.email || customerInfo.email)}
                        />
                      </div>

                      {/* Error Message */}
                      {loginError && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                          {loginError}
                        </div>
                      )}
                      
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={loginLoading}
                      >
                        {loginLoading ? 'Sending...' : 'Send magic link'}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center">
                      <div className="text-green-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        We've sent a magic link to <strong>{(visitorData?.email || customerInfo.email) || loginEmail}</strong>. Click the link to sign in and complete your checkout.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => window.location.href = '/'}
                className="text-sm text-brand-secondary hover:underline"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        {/* Order Summary (Desktop) */}
        <div className="hidden lg:block">
          <div className="p-6 border rounded">
            {items.map((item) => {
              const { product, price } = getProductAndPrice(item);
              if (!product || !price) return null;
              return (
                <div key={item.priceId} className="flex justify-between mb-2">
                  <span>{product.name}</span>
                  <span>${((price.unit_amount || 0) * item.quantity / 100).toFixed(2)}</span>
                </div>
              );
            })}
            <hr className="my-4" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>${(cartTotal / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module 6c: Guest Confirmation Dialog */}
      {showGuestConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out" />
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95">
            <div className="px-6 py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Create an account?</h3>
              <p className="text-sm text-gray-600 mb-6">
                We noticed you have contact information saved. Would you like to create an account to track your orders and manage your subscriptions?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    console.log('🧭 Guest accepted account creation — switching to user mode');
                    setShowGuestConfirmation(false);
                    setCheckoutMode('user');
                    setShowInlineLogin(true);
                    setCheckoutLoading(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Yes, create account
                </button>
                <button
                  onClick={async () => {
                    console.log('🧭 Guest declined account creation — continuing as guest');
                    setShowGuestConfirmation(false);
                    setCheckoutLoading(true);
                    
                    try {
                      console.log('🧭 Proceeding with guest checkout');
                      await checkoutSessionMutation.mutateAsync({
                        items,
                        customerEmail: visitorData?.email || customerInfo.email,
                        visitorId: visitorId || undefined,
                        checkoutMode: 'guest'
                      });
                    } finally {
                      setCheckoutLoading(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  No, continue as guest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            // Session will be updated via auth state listener
          }}
          email={visitorData?.email || customerInfo.email}
        />
      )}
    </div>
  );
}
