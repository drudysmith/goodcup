// CHECKOUT PAGE — USER-AGNOSTIC, TANSTACK-BASED, STRIPPED DATA LAYER
// --------------------------------------------------------------------------------
// This rebuild:
// - Removes all auth, Supabase, router, and eligibility logic
// - Preserves full UI/UX structure (Information → Shipping → Payment)
// - Uses TanStack Query for products and API operations
// - Uses local customer info state to simulate user identity

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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

export default function Checkout() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<CheckoutStage>('information');
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'user' | 'guest'>('user');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [isProcessingMerge, setIsProcessingMerge] = useState(false);
  
  // Module 6b.3.1: Inline login state
  const [showInlineLogin, setShowInlineLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLinkSent, setLoginLinkSent] = useState(false);

  // Visitor context for guest checkout
  const { visitorId, jwt, visitorData } = useVisitor();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    email: 'mock@example.com',
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Mockingbird Lane',
    apartment: '',
    city: 'Faketown',
    state: 'CA',
    zipCode: '90210',
    country: 'United States',
    phone: '555-123-4567',
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
    }
  }, [showInlineLogin]);

  // Products query
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

  // Check for existing Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseAnon.auth.getSession();
      setUserSession(session);
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseAnon.auth.onAuthStateChange(async (event, session) => {
      setUserSession(session);
      if (event === 'SIGNED_IN' && session && checkoutMode === 'user' && visitorId && !isProcessingMerge) {
        console.log('✅ User authentication successful');
        setShowAuthModal(false);
        
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
  }, [checkoutMode, visitorId, isProcessingMerge, items, customerInfo.email]);

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

  const handleContinueToShipping = () => {
    if (validateInformationStage()) {
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

    // Guest checkout flow using visitor context
    try {
      await checkoutSessionMutation.mutateAsync({
        items,
        customerEmail: customerInfo.email,
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
              <button onClick={handleContinueToShipping} className="w-full bg-brand-secondary text-white py-3 px-6 rounded disabled:opacity-50" disabled={!validateInformationStage()}>
                Continue to shipping
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

              {/* Module 6b.3.1: Inline Login Form */}
              {checkoutMode === 'user' && !userSession && showInlineLogin && (
                <div className="mt-4 p-4 border rounded bg-gray-50">
                  {!loginLinkSent ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Sign in to your account</h4>
                      <input
                        type="email"
                        placeholder="Email address"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full p-3 border rounded"
                        required
                      />
                      <button
                        onClick={async () => {
                          if (!loginEmail.trim()) return;
                          
                          try {
                            const { error } = await supabaseAnon.auth.signInWithOtp({
                              email: loginEmail.trim(),
                              options: {
                                emailRedirectTo: `${window.location.origin}/checkout?mode=user`
                              }
                            });

                            if (error) {
                              alert(error.message);
                            } else {
                              setLoginLinkSent(true);
                              console.log('📧 Magic link sent to:', loginEmail);
                            }
                          } catch (err) {
                            alert('Failed to send magic link');
                          }
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={!loginEmail.trim()}
                      >
                        Send magic link
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-green-600 mb-2">
                        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Check your email</h4>
                      <p className="text-xs text-gray-500">
                        We've sent a magic link to <strong>{loginEmail}</strong>
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

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            // Session will be updated via auth state listener
          }}
        />
      )}
    </div>
  );
}
