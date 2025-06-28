// CHECKOUT PAGE — USER-AGNOSTIC, TANSTACK-BASED, STRIPPED DATA LAYER
// --------------------------------------------------------------------------------
// This rebuild:
// - Removes all auth, Supabase, router, and eligibility logic
// - Preserves full UI/UX structure (Information → Shipping → Payment)
// - Keeps TanStack cart, product fetch, and checkout session creation
// - Uses local customer info state to simulate user identity

import { useEffect, useState } from 'react';
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

export default function Checkout() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<CheckoutStage>('information');
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'user' | 'guest'>('user');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);

  // Visitor context for guest checkout
  const { visitorId, jwt } = useVisitor();

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

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      });
  }, []);

  // Check for existing Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseAnon.auth.getSession();
      setUserSession(session);
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseAnon.auth.onAuthStateChange((event, session) => {
      setUserSession(session);
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User authentication successful');
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
  }, []);

  const getProductAndPrice = (item: CartItem) => {
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
        // User already signed in
        console.log('✅ User already authed — skipping sign-in flow');
        // TODO: Module 6 - Proceed with user checkout flow
        alert('Module 6: User checkout flow will be implemented next');
        setCheckoutLoading(false);
        return;
      } else {
        // User not signed in - show auth modal
        console.log('🔐 User opted for full auth — showing auth modal');
        setShowAuthModal(true);
        setCheckoutLoading(false);
        return;
      }
    }

    // Guest checkout flow using visitor context
    try {
      const response = await fetch('/api/createCheckoutSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerEmail: customerInfo.email,
          // Include visitor context for guest checkout
          visitorId: visitorId,
          checkoutMode: 'guest'
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (err) {
      alert('Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="text-center py-16">Loading...</div>;
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
