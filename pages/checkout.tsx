// CHECKOUT PAGE — USER-AGNOSTIC, TANSTACK-BASED, STRIPPED DATA LAYER
// --------------------------------------------------------------------------------
// This rebuild:
// - Removes all auth, Supabase, router, and eligibility logic
// - Preserves full UI/UX structure (Information → Shipping → Payment)
// - Uses TanStack Query for products and API operations
// - Uses local customer info state to simulate user identity

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseSession, useSupabaseSessionHelpers, useSessionExpiryMutation } from '../lib/queries/sessionQueries';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';
import { useCartStore, CartItem } from '../store/cartStore';
import { CheckoutModeToggle } from '../components/CheckoutModeToggle';
import { openAuthModal } from '../store/authModalStore';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { useAuthActions } from '../lib/hooks/useAuthActions';
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

// SMU 4.3b: User profile response interface
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

const createCheckoutSession = async (payload: {
  items: CartItem[];
  customerEmail: string;
  supabaseUserId?: string;
  visitorId?: string;
  visitorJwt?: string;
  checkoutMode: 'user' | 'guest';
  orderId?: string;
  stripeMode?: 'subscription' | 'payment';
  successRedirect?: string;
  cancelRedirect?: string;
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

// Contact info saving function with visitor recognition and cart overwrite
const saveContactInfo = async (contactData: any, visitorId: string, cart: CartItem[]) => {
  const response = await fetch('/api/visitor/identifyContact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      visitor_id: visitorId,
      email: contactData.email,
      phone: contactData.phone,
      name: contactData.name,
      cart: cart
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save contact info');
  }

  return response.json();
};

// Module 7: User profile data fetching via secure API endpoint (with Module 8 session expiry handling)
const fetchUserProfile = async (session: any, sessionExpiryHandler?: () => Promise<boolean>): Promise<UserProfileResponse | null> => {
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
      const refreshed = await sessionExpiryHandler();
      if (refreshed) {
        // Retry the request with the refreshed session
        return fetchUserProfile(session, sessionExpiryHandler);
      }
    }
    return null;
  }

  const profileData = await response.json();
  
  return profileData;
};

export default function Checkout() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const removeItemsByPriceIds = useCartStore((s) => s.removeItemsByPriceIds);
  const queryClient = useQueryClient();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<CheckoutStage>('information');
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'user' | 'guest'>('user');
  
  // TanStack: Checkout flow state sourced from URL once
  const checkoutFlowQuery = useQuery({
    queryKey: ['checkoutFlow'],
    queryFn: async () => ({ flow: 'single' as 'single' | 'dual', type: 'sub' as 'sub' | 'oneoff' }),
    staleTime: Infinity,
  });

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
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLinkSent, setLoginLinkSent] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Auth actions hook for password authentication
  const authActions = useAuthActions();
  
  // Module 6c: Guest flow reconciliation state
  const [showGuestConfirmation, setShowGuestConfirmation] = useState(false);

  // Visitor context for guest checkout
  const { visitorId, jwt, visitorData, updateVisitorIdentity } = useVisitor();

  // Promo query for pricing
  const { data: promo } = useBannerPromoQuery();

  // TanStack Query for customer info data state management
  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo'],
    queryFn: () => {
      // Initialize with empty defaults
      return {
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
      } as CustomerInfo;
    },
    staleTime: Infinity, // Customer info doesn't change unless explicitly updated
  });

  // TanStack Mutation for updating customer info
  const updateCustomerInfoMutation = useMutation({
    mutationFn: async (newCustomerInfo: CustomerInfo) => {
      return newCustomerInfo;
    },
    onSuccess: (newCustomerInfo) => {
      queryClient.setQueryData(['customerInfo'], newCustomerInfo);
    },
  });

  // Helper function to update customer info safely
  const updateCustomerInfoField = (field: keyof CustomerInfo, value: string) => {
    const currentData = customerInfoQuery.data || {
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
    };
    updateCustomerInfoMutation.mutate({
      ...currentData,
      [field]: value,
    });
  };

  // Prefill login email when inline login shows
  useEffect(() => {
    if (showInlineLogin && !loginEmail) {
      const prefillEmail = visitorData?.email || customerInfoQuery.data?.email;
      if (prefillEmail) {
        setLoginEmail(prefillEmail);
      }
    }
    // Clear password when form is shown for security
    if (showInlineLogin) {
      setLoginPassword('');
    }
  }, [showInlineLogin, visitorData?.email, customerInfoQuery.data?.email, loginEmail]);



  // Module 6b.3.1: Prefill login email from available data
  useEffect(() => {
    const prefillEmail = visitorData?.email || customerInfoQuery.data?.email;
    if (prefillEmail && !loginEmail) {
      setLoginEmail(prefillEmail);
    }
  }, [visitorData?.email, customerInfoQuery.data?.email, loginEmail]);

  // Module 6b.3.1: Confirm inline form display
  useEffect(() => {
    if (showInlineLogin) {
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

  // Module 6e: Prefill customerInfo from available data using TanStack mutation
  // Only run once when data first becomes available, not when user is editing
  const [hasPrefilledData, setHasPrefilledData] = useState(false);
  
  useEffect(() => {
    // Only prefill if we haven't already and have no user-entered data
    const currentData = customerInfoQuery.data;
    const hasUserData = currentData?.email || currentData?.firstName || currentData?.phone;
    
    if (hasPrefilledData || hasUserData) {
      return; // Don't overwrite user input or prefill twice
    }
    
    const profileData = userProfileQuery.data;
    
    if (userSession && profileData) {
      // Prefill from user profile data
      const nameParts = profileData.name ? profileData.name.split(' ') : ['', ''];
      updateCustomerInfoMutation.mutate({
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
      setHasPrefilledData(true);
    } else if (visitorData && !userSession) {
      // Prefill from visitor data
      const nameParts = visitorData.name ? visitorData.name.split(' ') : ['', ''];
      const currentData = customerInfoQuery.data || {};
      updateCustomerInfoMutation.mutate({
        ...currentData,
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
      });
      setHasPrefilledData(true);
    }
  }, [userSession, userProfileQuery.data, visitorData, updateCustomerInfoMutation, customerInfoQuery.data, hasPrefilledData]);

  // Checkout session mutation
  const checkoutSessionMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (checkoutData) => {
      if (checkoutData.url) {
        window.location.assign(checkoutData.url);
      } else {
        alert(checkoutData.error || 'Checkout failed');
      }
    },
    onError: (error) => {
      alert('Checkout failed');
    },
  });

  // Contact info saving mutation
  const saveContactInfoMutation = useMutation({
    mutationFn: ({ contactData, visitorId, cart }: { contactData: any; visitorId: string; cart: CartItem[] }) => saveContactInfo(contactData, visitorId, cart),
    onSuccess: (data) => {
      // Update visitor identity if merge occurred
      if (data.visitor_id && data.jwt && data.visitor) {
        updateVisitorIdentity(data.visitor_id, data.jwt, data.visitor);
      }
      // Invalidate visitor query to refresh data with saved contact info
      queryClient.invalidateQueries({ queryKey: ['visitor', visitorId] });
      if (userSession) {
        // Also invalidate user profile if authenticated
        queryClient.invalidateQueries({ queryKey: ['userProfile', userSession.user.id] });
      }
    },
    onError: (error) => {
      alert('Failed to save contact info. Please try again.');
    },
  });

  // Shipment order saving function (writes to shipment_orders table)
  const saveShipmentOrder = async (shipmentData: any, token: string) => {
//     console.log('🚀 FRONTEND: saveShipmentOrder called - initiating API request to /api/saveShipmentOrder');
//     console.log('💾 SAVE SHIPMENT ORDER - API Call:', { shipmentData, token });
    // DEBUG: Log the shipmentData payload in detail
//     console.log('DEBUG shipmentData payload:', JSON.stringify(shipmentData, null, 2));
    
    const response = await fetch('/api/saveShipmentOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ shipmentData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save shipment order');
    }

    return response.json();
  };

  // Shipment order saving mutation
  const saveShipmentOrderMutation = useMutation({
    mutationFn: ({ shipmentData, token }: { shipmentData: any; token: string }) => saveShipmentOrder(shipmentData, token),
    onSuccess: (data) => {
//       console.log('✅ SAVE SHIPMENT ORDER - Success:', data);
    },
    onError: (error) => {
      console.error('❌ SAVE SHIPMENT ORDER - Error:', error);
      alert('Failed to save shipment order. Please try again.');
    },
  });

  // Helper function to prepare shipment order data
  const prepareShipmentOrderData = () => {
    const isGiftShipping = shippingToggleQuery.data;
    const addressData = shippingAddressQuery.data;
    const isAddressDirty = addressDirtyQuery.data;
    
    return {
      // Visitor/User identification
      visitor_id: visitorId,
      user_id: userSession?.user?.id || null,
      email: visitorData?.email || userSession?.user?.email || '',
      phone: visitorData?.phone || '',
      
      // Recipient address (self or guest)
      recipient_name: addressData?.name || '',
      address_line1: addressData?.street || '',
      address_line2: addressData?.unit || '',
      city: addressData?.city || '',
      state: addressData?.state || '',
      postal_code: addressData?.postal_code || '',
      country: addressData?.country || '',
      
      // Shipping mode and metadata
      shipping_mode: isGiftShipping ? 'gift' : 'self',
      is_address_dirty: isAddressDirty,
      
      // Cart/order context (if needed)
      cart_items: items,
      cart_total: items.reduce((sum, item) => {
        const { price } = getProductAndPrice(item);
        return sum + ((price?.unit_amount || 0) * item.quantity);
      }, 0),
      
      // Metadata
      created_at: new Date().toISOString(),
    };
  };

  // TanStack Query for shipping toggle state management
  const shippingToggleQuery = useQuery({
    queryKey: ['shippingToggle'],
    queryFn: () => {
      // Initialize with default value (false = self, true = guest)
      return false;
    },
    staleTime: Infinity, // Shipping toggle doesn't change unless explicitly updated
  });

  // TanStack Mutation for updating shipping toggle
  const updateShippingToggleMutation = useMutation({
    mutationFn: async (newToggleState: boolean) => {
      return newToggleState;
    },
    onSuccess: (newToggleState) => {
      queryClient.setQueryData(['shippingToggle'], newToggleState);
    },
  });

  // TanStack Query for shipping address state management
  const shippingAddressQuery = useQuery({
    queryKey: ['shippingAddress'],
    queryFn: () => {
      // Initialize with empty defaults
      return {
        name: '',
        street: '',
        unit: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      };
    },
    staleTime: Infinity, // Address info doesn't change unless explicitly updated
  });

  // TanStack Mutation for updating shipping address
  const updateShippingAddressMutation = useMutation({
    mutationFn: async (newAddressData: any) => {
      return newAddressData;
    },
    onSuccess: (newAddressData) => {
      queryClient.setQueryData(['shippingAddress'], newAddressData);
    },
  });

  // TanStack Query for tracking if address form is dirty (edited)
  const addressDirtyQuery = useQuery({
    queryKey: ['addressDirty'],
    queryFn: () => false,
    staleTime: Infinity,
  });

  // TanStack Mutation for updating dirty state
  const updateAddressDirtyMutation = useMutation({
    mutationFn: async (isDirty: boolean) => {
      return isDirty;
    },
    onSuccess: (isDirty) => {
      queryClient.setQueryData(['addressDirty'], isDirty);
    },
  });

  // Helper function to update shipping address field safely
  const updateShippingAddressField = (field: string, value: string) => {
    const currentData = shippingAddressQuery.data || {
      name: '',
      street: '',
      unit: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    };
    updateShippingAddressMutation.mutate({
      ...currentData,
      [field]: value,
    });
  };

  // Handle address field changes and mark as dirty
  const handleAddressFieldChange = (field: string, value: string) => {
    updateShippingAddressField(field, value);
    updateAddressDirtyMutation.mutate(true);
  };

  // Prefill shipping address from available data when toggle is 'self'
  const [hasPrefilledAddress, setHasPrefilledAddress] = useState(false);
  
  useEffect(() => {
    const isGuestToggle = shippingToggleQuery.data;
    
    if (isGuestToggle) {
      // Clear address when toggled to gift
      updateShippingAddressMutation.mutate({
        name: '',
        street: '',
        unit: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      });
      updateAddressDirtyMutation.mutate(false);
      setHasPrefilledAddress(false); // Reset so it can repopulate when toggling back
      return;
    }

    // Only prefill for 'self' if we haven't already and have data available
    if (hasPrefilledAddress) {
      return;
    }

    const profileData = userProfileQuery.data;
    
    if (userSession && profileData) {
      // Prefill from user profile data
      updateShippingAddressMutation.mutate({
        name: profileData.name || '',
        street: profileData.street || '',
        unit: profileData.unit || '',
        city: profileData.city || '',
        state: profileData.state || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || '',
      });
      setHasPrefilledAddress(true);
    } else if (visitorData && !userSession) {
      // Prefill from visitor data
      updateShippingAddressMutation.mutate({
        name: visitorData.name || '',
        street: visitorData.street || '',
        unit: visitorData.unit || '',
        city: visitorData.city || '',
        state: visitorData.state || '',
        postal_code: visitorData.postal_code || '',
        country: visitorData.country || '',
      });
      setHasPrefilledAddress(true);
    }
  }, [shippingToggleQuery.data, userSession, userProfileQuery.data, visitorData, hasPrefilledAddress]);

  // State Mgmt Update 2: Setup auth state change listener
  useEffect(() => {
    // Listen for auth state changes and update query cache
    const { data: { subscription } } = supabaseAnon.auth.onAuthStateChange(async (event, session) => {
      setSessionData(session);
      // Do not auto-forward to Stripe on SIGNED_IN; preserve explicit gate flow
      if (event === 'SIGNED_IN' && session) {
        setShowInlineLogin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkoutMode, isProcessingMerge, items, customerInfoQuery.data?.email, setSessionData, checkoutSessionMutation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // Initialize checkout flow from URL once
    const flowParam = params.get('flow');
    const typeParam = params.get('type');
    if (flowParam === 'dual' || flowParam === 'single') {
      const next = {
        flow: flowParam as 'single' | 'dual',
        type: typeParam === 'oneoff' ? 'oneoff' as const : 'sub' as const,
      };
      queryClient.setQueryData(['checkoutFlow'], next);
    }
    // Set checkout mode from URL parameter
    const modeParam = params.get('mode');
    if (modeParam === 'guest' || modeParam === 'user') {
      setCheckoutMode(modeParam);
    }
    // Handle post-Stripe return selectively
    const successParam = params.get('success');
    if (successParam === '1') {
      const currentFlow = (queryClient.getQueryData(['checkoutFlow']) as any) || { flow: 'single', type: typeParam === 'oneoff' ? 'oneoff' : 'sub' };
      // Compute purchased priceIds by type
      const priceIdsToRemove: string[] = items
        .filter((ci) => {
          const { price } = getProductAndPrice(ci);
          const isSub = !!price?.recurring;
          return currentFlow.type === 'sub' ? isSub : !isSub;
        })
        .map((ci) => ci.priceId);
      if (priceIdsToRemove.length > 0) {
        removeItemsByPriceIds(priceIdsToRemove);
      }
      // If dual flow and just finished sub, flip to oneoff for next leg
      if (currentFlow.flow === 'dual' && currentFlow.type === 'sub') {
        queryClient.setQueryData(['checkoutFlow'], { flow: 'dual', type: 'oneoff' as const });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsQuery.data, items]);

  // Helper to get product/price info for cart items
  const getProductAndPrice = (item: CartItem) => {
    const product = productsQuery.data?.products.find((p) => p.id === item.productId);
    const price = product?.prices.find((pr) => pr.id === item.priceId);
    return { product, price };
  };

  // Determine current target type for this leg and filter items accordingly
  const getCurrentTargetType = (): 'sub' | 'oneoff' => {
    const cf = (checkoutFlowQuery.data as any);
    if (cf?.type === 'oneoff' || cf?.type === 'sub') return cf.type;
    const hasSub = items.some(ci => {
      const { price } = getProductAndPrice(ci);
      return !!price?.recurring;
    });
    return hasSub ? 'sub' : 'oneoff';
  };

  const filteredItems = items.filter((ci) => {
    const { price } = getProductAndPrice(ci);
    const isSub = !!price?.recurring;
    return getCurrentTargetType() === 'sub' ? isSub : !isSub;
  });

  // Helper to format recurring interval
  const formatRecurringInterval = (recurring: { interval: string; interval_count?: number }) => {
    const count = recurring.interval_count || 1;
    const interval = recurring.interval;
    
    if (count === 1) {
      return interval === 'week' ? 'week' : 
             interval === 'month' ? 'month' : 
             interval === 'year' ? 'year' : interval;
    } else {
      return interval === 'week' ? `${count} weeks` : 
             interval === 'month' ? `${count} months` : 
             interval === 'year' ? `${count} years` : `${count} ${interval}s`;
    }
  };

  const cartTotal = filteredItems.reduce((sum, item) => {
    const { price } = getProductAndPrice(item);
    return sum + ((price?.unit_amount || 0) * item.quantity);
  }, 0);

  const validateInformationStage = () => {
    return customerInfoQuery.data?.email && customerInfoQuery.data?.firstName;
  };

  const validateShippingStage = () => {
    const addressData = shippingAddressQuery.data;
    return addressData?.name && addressData?.street && addressData?.city && addressData?.state && addressData?.postal_code && addressData?.country;
  };

  const handleContinueToShipping = async () => {
    if (!validateInformationStage()) {
      return;
    }

    // Save contact info before proceeding to shipping
      const contactPayload = {
        email: customerInfoQuery.data?.email || '',
        phone: customerInfoQuery.data?.phone || '',
        name: `${customerInfoQuery.data?.firstName || ''} ${customerInfoQuery.data?.lastName || ''}`.trim(),
      };

      try {
        // Only save if we have at least email and name and visitorId
        if (contactPayload.email && contactPayload.name && visitorId) {
          await saveContactInfoMutation.mutateAsync({ contactData: contactPayload, visitorId, cart: items });
        }
          
      // Proceed to shipping stage after successful save
      setCurrentStage('shipping');
      } catch (error) {
      // Still allow proceeding to shipping even if save fails
    setCurrentStage('shipping');
    }
  };

  const handleReturnToInformation = () => {
    setCurrentStage('information');
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    const currentFlow = (checkoutFlowQuery.data as any) || { flow: 'single', type: undefined };
    // Determine target type
    let targetType: 'sub' | 'oneoff' | undefined = currentFlow.type;
    if (!targetType) {
      // Derive from cart if not provided
      const hasSub = items.some(ci => {
        const pr = productsQuery.data?.products.find(p=>p.id===ci.productId)?.prices.find(pr=>pr.id===ci.priceId);
        return !!pr?.recurring;
      });
      targetType = hasSub ? 'sub' : 'oneoff';
    }
    const stripeMode: 'subscription' | 'payment' = targetType === 'sub' ? 'subscription' : 'payment';
    const filteredItems = items.filter(ci => {
      const pr = productsQuery.data?.products.find(p=>p.id===ci.productId)?.prices.find(pr=>pr.id===ci.priceId);
      const isSub = !!pr?.recurring;
      return targetType === 'sub' ? isSub : !isSub;
    });
    const isSingleSub = ((currentFlow.flow || 'single') === 'single' && stripeMode === 'subscription');
    const isDualFinalLeg = ((currentFlow.flow || 'single') === 'dual' && targetType === 'oneoff');
    const successRedirect = typeof window !== 'undefined'
      ? (
          (isSingleSub || isDualFinalLeg)
            ? `${window.location.origin}/dashboard?success=1`
            : `${window.location.origin}/checkout?mode=${checkoutMode}&flow=${currentFlow.flow || 'single'}&type=${targetType}&success=1`
        )
      : undefined;
    const cancelRedirect = typeof window !== 'undefined' ? `${window.location.origin}/checkout?mode=${checkoutMode}&flow=${currentFlow.flow || 'single'}&type=${targetType}&canceled=1` : undefined;
    
    // Gate #4: Ensure shipment order is saved for authorized users before payment
    if (checkoutMode === 'user' && userSession) {
      try {
        // Validate shipping info
        if (!validateShippingStage()) {
          alert('Please complete all shipping address fields before proceeding');
          setCheckoutLoading(false);
          return;
        }
        // Prepare shipment order data (handles gift orders appropriately)
	//         console.log('🚪 GATE 4: Preparing shipment order data for authorized user...');
        const shipmentData = prepareShipmentOrderData();
        const token = userSession.access_token;
	//         console.log('🚪 GATE 4: shipmentData', shipmentData);
	//         console.log('🚪 GATE 4: token', token);
        if (!token) {
          alert('Authentication required to save shipment order');
          setCheckoutLoading(false);
          return;
        }
	//         console.log('🚪 GATE 4: Saving shipment order before payment...');
        const shipmentResult = await saveShipmentOrderMutation.mutateAsync({ shipmentData, token });
	//         console.log('🚪 GATE 4: Shipment order saved, proceeding to payment...');
        // Proceed to payment (Stripe checkout session, etc.)
        await checkoutSessionMutation.mutateAsync({
          items: filteredItems,
          customerEmail: userSession.user.email || customerInfoQuery.data?.email || '',
          supabaseUserId: userSession.user.id,
          checkoutMode: 'user',
          orderId: shipmentResult.order_id,
          stripeMode,
          successRedirect,
          cancelRedirect,
        });
        setCheckoutLoading(false);
        return;
      } catch (error) {
        alert('Failed to save shipment order or proceed to checkout. Please try again.');
        setCheckoutLoading(false);
        return;
      }
    }

    // Check shipping stage validation and handle address saving logic
    const isGiftShipping = shippingToggleQuery.data;
    const isAddressDirty = addressDirtyQuery.data;
    
    try {
      if (isGiftShipping) {
        // If shipping to gift, validate address is complete
        if (!validateShippingStage()) {
          alert('Please complete all shipping address fields');
          setCheckoutLoading(false);
          return;
        }
        // TODO: Save gift shipping address to shipment_orders table
//         console.log('Gift shipping - would save to shipment_orders:', shippingAddressQuery.data);
      } else {
        // If shipping to self
        if (isAddressDirty) {
          // Address was edited, save to visitor table
          // TODO: Call address saving API here
//           console.log('Self shipping with edits - would save to visitor table:', shippingAddressQuery.data);
        }
        // If not dirty, just proceed without saving
      }

      // Continue with existing checkout flow
      if (checkoutMode === 'user') {
        // Module 5: User Auth Trigger
        if (userSession) {
          // Module 6a: Session Short-Circuit
          try {
            await checkoutSessionMutation.mutateAsync({
              items: filteredItems,
              customerEmail: userSession.user.email || customerInfoQuery.data?.email || '',
              supabaseUserId: userSession.user.id,
              checkoutMode: 'user',
              stripeMode,
              successRedirect,
              cancelRedirect,
            });
          } finally {
            setCheckoutLoading(false);
          }
          return;
        } else {
          // User not signed in - show inline login
          setShowInlineLogin(true);
          setCheckoutLoading(false);
          return;
        }
      }

      // Module 6c: Guest Flow Reconciliation
      const hasVisitorContactInfo = visitorData?.email || visitorData?.name || visitorData?.phone;
      
      if (hasVisitorContactInfo && !showGuestConfirmation) {
        // Show confirmation dialog for guests with saved contact info
        setShowGuestConfirmation(true);
        setCheckoutLoading(false);
        return;
      }

      // Guest checkout flow using visitor context
      await checkoutSessionMutation.mutateAsync({
        items: filteredItems,
        customerEmail: visitorData?.email || customerInfoQuery.data?.email || '',
        visitorId: visitorId || undefined,
        visitorJwt: jwt || undefined,
        checkoutMode: 'guest',
        stripeMode,
        successRedirect,
        cancelRedirect,
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
            <button 
              onClick={() => setOrderSummaryExpanded(!orderSummaryExpanded)} 
              className="w-full flex justify-between items-center p-4 border border-neutral-border rounded-lg bg-surface hover:bg-neutral-muted-bg transition-colors cursor-pointer shadow-sm"
            >
              <span className="text-xl font-medium text-text-primary">
                {orderSummaryExpanded ? 'Hide order summary' : 'Show order summary'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {(() => {
                    const subtotal = items.reduce((sum, item) => {
                      const { price } = getProductAndPrice(item);
                      return sum + ((price?.unit_amount || 0) * item.quantity);
                    }, 0);
                    let promoSubtotal = null;
                    if (promo && (promo.percent_off || promo.amount_off)) {
                      if (promo.percent_off) {
                        promoSubtotal = subtotal * (1 - promo.percent_off / 100);
                      } else if (promo.amount_off) {
                        promoSubtotal = subtotal - promo.amount_off * items.length;
                      }
                    }
                    return promoSubtotal && promoSubtotal < subtotal ? (
                      <>
                        <span className="line-through text-text-secondary opacity-60 mr-1">${(subtotal / 100).toFixed(2)}</span>
                        <span className="text-brand-secondary font-medium">${(promoSubtotal / 100).toFixed(2)}</span>
                      </>
                    ) : (
                      <span>${(subtotal / 100).toFixed(2)}</span>
                    );
                  })()}
                </span>
                <svg 
                  className={`w-5 h-5 text-text-secondary transition-transform ${orderSummaryExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {orderSummaryExpanded && (
              <div className="mt-4 space-y-4">
                {filteredItems.map((item) => {
                  const { product, price } = getProductAndPrice(item);
                  if (!product || !price) return null;
                  const displayPrice = price.unit_amount || 0;
                  let promoPrice = null;
                  if (promo && (promo.percent_off || promo.amount_off)) {
                    if (promo.percent_off) {
                      promoPrice = displayPrice * (1 - promo.percent_off / 100);
                    } else if (promo.amount_off) {
                      promoPrice = displayPrice - promo.amount_off;
                    }
                  }
                  return (
                    <div key={item.priceId} className="flex justify-between border p-2 rounded">
                      <div className="text-lg">
                        <span>{product.name}</span>
                        <span className="text-text-secondary ml-2">× {item.quantity}</span>
                      </div>
                      <div className="text-lg">
                        {promoPrice && promoPrice < displayPrice ? (
                          <>
                            <span className="line-through text-text-secondary opacity-60 mr-1">${((displayPrice * item.quantity) / 100).toFixed(2)}</span>
                            <span className="text-brand-secondary font-medium">${((promoPrice * item.quantity) / 100).toFixed(2)}</span>
                          </>
                        ) : (
                          <span>${((displayPrice * item.quantity) / 100).toFixed(2)}</span>
                        )}
                      </div>
                      <div className="text-sm text-text-tertiary mt-1">{price?.recurring ? 'Subscription' : 'One-time'} purchase</div>
                    </div>
                  );
                })}
                <div className="text-right font-bold text-lg">
                  {(() => {
                    const subtotal = filteredItems.reduce((sum, item) => {
                      const { price } = getProductAndPrice(item);
                      return sum + ((price?.unit_amount || 0) * item.quantity);
                    }, 0);
                    let promoSubtotal = null;
                    if (promo && (promo.percent_off || promo.amount_off)) {
                      if (promo.percent_off) {
                        promoSubtotal = subtotal * (1 - promo.percent_off / 100);
                      } else if (promo.amount_off) {
                        promoSubtotal = subtotal - promo.amount_off * filteredItems.length;
                      }
                    }
                    return promoSubtotal && promoSubtotal < subtotal ? (
                      <>
                        <span className="line-through text-text-secondary opacity-60 mr-2">${(subtotal / 100).toFixed(2)}</span>
                        <span className="text-brand-secondary">${(promoSubtotal / 100).toFixed(2)}</span>
                      </>
                    ) : (
                      <span>${(subtotal / 100).toFixed(2)}</span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="mb-6 text-lg text-text-secondary">
            <button 
              onClick={handleReturnToInformation}
              className={`${currentStage === 'information' ? 'text-brand-secondary font-medium' : 'opacity-60'} hover:text-brand-secondary transition-colors`}
            >
              Contact Info
            </button>
            <span className="mx-2">›</span>
            <span className={currentStage === 'shipping' ? 'text-brand-secondary font-medium' : 'opacity-60'}>
              Shipping
            </span>
            <span className="mx-2">›</span>
            <span className="opacity-40">
              Payment
            </span>
          </div>

          {/* Stage: Contact Info */}
          {currentStage === 'information' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Contact Information</h2>
              <input 
                type="text" 
                placeholder="Full name" 
                value={customerInfoQuery.data?.firstName && customerInfoQuery.data?.lastName 
                  ? `${customerInfoQuery.data.firstName} ${customerInfoQuery.data.lastName}`.trim()
                  : customerInfoQuery.data?.firstName || ''
                } 
                onChange={(e) => {
                  const nameParts = e.target.value.split(' ');
                  const firstName = nameParts[0] || '';
                  const lastName = nameParts.slice(1).join(' ') || '';
                  updateCustomerInfoMutation.mutate({ 
                    ...customerInfoQuery.data, 
                    firstName, 
                    lastName 
                  } as CustomerInfo);
                }} 
                className="w-full p-3 border rounded text-lg" 
              />
              <input 
                type="email" 
                placeholder="Email" 
                value={customerInfoQuery.data?.email || ''} 
                onChange={(e) => updateCustomerInfoMutation.mutate({ 
                  ...customerInfoQuery.data, 
                  email: e.target.value 
                } as CustomerInfo)} 
                className="w-full p-3 border rounded text-lg" 
              />
              <input 
                type="tel" 
                placeholder="Phone number (optional)" 
                value={customerInfoQuery.data?.phone || ''} 
                onChange={(e) => updateCustomerInfoField('phone', e.target.value)} 
                className="w-full p-3 border rounded text-lg" 
              />
              <div className="flex justify-center mb-4">
                <button onClick={handleContinueToShipping} className="w-1/2 bg-brand-secondary text-lg text-white py-3 px-6 rounded-full disabled:opacity-50 hover:opacity-80" disabled={!validateInformationStage() || saveContactInfoMutation.isPending}>
                  {saveContactInfoMutation.isPending ? 'Saving contact...' : 'Continue to shipping'}
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-xl text-brand-secondary hover:underline"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Stage: Shipping */}
          {currentStage === 'shipping' && (
            <div className="space-y-6">
              {/* Free Shipping Note */}
              <div className="text-center py-3">
                <p className="text-3xl text-brand-secondary font-medium">🚚 Free shipping to the US</p>
              </div>
                              <div className="border p-4 rounded">
                 <div className="mb-3 text-2xl text-text-secondary">
                   Shipping  {shippingToggleQuery.data ? 'as a gift' : 'to yourself'}
                 </div>
                 <div className="mb-4">
                   <button
                     type="button"
                     aria-pressed={shippingToggleQuery.data}
                     onClick={() => updateShippingToggleMutation.mutate(!shippingToggleQuery.data)}
                     className={`relative w-16 h-8 rounded-full transition-colors duration-200 focus:outline-none ${
                       shippingToggleQuery.data ? 'bg-brand-secondary' : 'bg-gray-300'
                     }`}
                   >
                     <span
                       className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                         shippingToggleQuery.data ? 'translate-x-8' : ''
                       }`}
                     />
                     <span className="sr-only">
                       Toggle between shipping to self or guest
                     </span>
                   </button>
                   <span className="ml-3 text-lg text-text-primary">
                     Gift
                   </span>
                 </div>
                 <div className="space-y-4">
                   <input
                     type="text"
                     placeholder="Full name"
                     value={shippingAddressQuery.data?.name || ''}
                     onChange={(e) => handleAddressFieldChange('name', e.target.value)}
                     className="w-full p-3 border rounded text-lg"
                   />
                   <input
                     type="text"
                     placeholder="Street address"
                     value={shippingAddressQuery.data?.street || ''}
                     onChange={(e) => handleAddressFieldChange('street', e.target.value)}
                     className="w-full p-3 border rounded text-lg"
                   />
                   <input
                     type="text"
                     placeholder="Apartment, suite, etc. (optional)"
                     value={shippingAddressQuery.data?.unit || ''}
                     onChange={(e) => handleAddressFieldChange('unit', e.target.value)}
                     className="w-full p-3 border rounded text-lg"
                   />
                   <div className="grid grid-cols-2 gap-4">
                     <input
                       type="text"
                       placeholder="City"
                       value={shippingAddressQuery.data?.city || ''}
                       onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                       className="w-full p-3 border rounded text-lg"
                     />
                     <input
                       type="text"
                       placeholder="State"
                       value={shippingAddressQuery.data?.state || ''}
                       onChange={(e) => handleAddressFieldChange('state', e.target.value)}
                       className="w-full p-3 border rounded text-lg"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <input
                       type="text"
                       placeholder="ZIP code"
                       value={shippingAddressQuery.data?.postal_code || ''}
                       onChange={(e) => handleAddressFieldChange('postal_code', e.target.value)}
                       className="w-full p-3 border rounded text-lg"
                     />
                     <input
                       type="text"
                       placeholder="Country"
                       value={shippingAddressQuery.data?.country || ''}
                       onChange={(e) => handleAddressFieldChange('country', e.target.value)}
                       className="w-full p-3 border rounded text-lg"
                     />
                   </div>
                 </div>
                </div>
              {/* Promo code reminder note - moved here */}
              {promo && promo.code && (
                <div className="text-lg text-brand-secondary bg-brand-secondary/10 rounded px-3 py-2 mb-4 text-center font-medium">
                  <div className="space-y-1">
                    <p>
                      Use promo code <span className="font-bold">{promo.code}</span> at checkout.
                    </p>
                    {promo.duration && (
                      <p>
                        {promo.duration === 'once' 
                          ? 'Applies to first month.'
                          : promo.duration === 'forever'
                          ? 'Good forever.'
                          : promo.duration === 'repeating' && promo.duration_in_months
                          ? `Good for ${promo.duration_in_months} months of subscription.`
                          : null
                        }
                      </p>
                    )}
                    {promo.first_time_transaction && (
                      <p>
                        Good for first time orders.
                      </p>
                    )}
                  </div>
                </div>
              )}  

              {/* Account creation reminder note */}
              {!(visitorData?.has_account || userSession) && (
              <div className="text-lg text-blue-600 bg-blue-50 rounded px-3 py-2 mb-4 text-center font-medium">
                <div className="space-y-1">
                  <p>
                    Create an account to <span className="font-bold">manage subscriptions</span>.
                    <br/>Modify or cancel any time.
                  </p>
                </div>
              </div>  
              )}
              {/* Checkout Mode Toggle - Only show for guests */}
              {!userSession && (
                <div className="mb-4">
                  <CheckoutModeToggle
                    onModeChange={setCheckoutMode}
                    defaultMode={checkoutMode}
                    className=""
                  />
                </div>
              )}
              <div className="flex justify-center mb-4">
                <button onClick={handleCheckout} disabled={checkoutLoading} className="w-1/2 bg-brand-secondary text-lg text-white py-3 px-6 rounded-full disabled:opacity-50 hover:opacity-80">
                {checkoutLoading ? 'Processing...' : 
                  userSession ? 'Continue to payment' : 
                  checkoutMode === 'user' ? 'Continue as user/sign in' : 'Continue to payment'
                }
              </button>
              </div>
              {/* Module 6b.3.1 & 6b.3.2: Inline Login Form */}
              {checkoutMode === 'user' && !userSession && showInlineLogin && (
                <div className="mt-4 p-4 border rounded bg-gray-50">
                  {!loginLinkSent ? (
                    <div className="space-y-6">
                      <h4 className="text-2xl font-medium text-text-primary">Sign in or create account</h4>
                      <input
                        type="email"
                        id="inline-email"
                        placeholder="email@email.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                        required
                        disabled={loginLoading || authActions.isLoading}
                        readOnly={!!(visitorData?.email || customerInfoQuery.data?.email)}
                      />
                      <p className="text-xl text-text-secondary">Either option below redirects to payment</p>

                      {(loginError || authActions.error) && (
                        <div className="text-semantic-error text-lg bg-semantic-error/10 border border-semantic-error/20 rounded px-3 py-2">
                          {loginError || authActions.error}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Password Option */}
                        <div className="space-y-3">
                          <div className="font-semibold text-base text-text-primary mb-1">SIGN IN WITH PASSWORD</div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              
                              // GATE 2: SIGN IN WITH PASSWORD BUTTON
                              // ====================================
                              // Before password authentication, we must save shipment order to ensure
                              // fulfillment data is captured before user proceeds to payment
//                               console.log('🚪 GATE 2: Sign In with Password - Starting validation and save process');
                              
                              if (!loginEmail.trim()) {
                                setLoginError('Email is required');
                                return;
                              }
                              if (!loginPassword.trim()) {
                                setLoginError('Password is required');
                                return;
                              }
                              
                              // Validate shipping address is complete
                              if (!validateShippingStage()) {
                                setLoginError('Please complete all shipping address fields before proceeding');
                                return;
                              }
                              
                              setLoginError(null);
                              
                              try {
                                // Step 1: Save shipment order BEFORE password authentication
//                                 console.log('🚪 GATE 2: Preparing shipment order data...');
                                const shipmentData = prepareShipmentOrderData();
                                const token = (userSession as any)?.access_token || jwt;
                                
                                if (!token) {
                                  setLoginError('Authentication required to save shipment order');
                                  return;
                                }
                                
//                                 console.log('🚪 GATE 2: Saving shipment order before password auth...');
                                const shipmentResult = await saveShipmentOrderMutation.mutateAsync({ shipmentData, token });
                                
                                // Step 2: Authenticate with password only after successful save
//                                 console.log('🚪 GATE 2: Shipment order saved, attempting password authentication...');
                                authActions.signInWithPassword(loginEmail.trim(), loginPassword);
//                                 console.log('🚪 GATE 2: Password authentication initiated');
                                
                              } catch (err) {
                                setLoginError('Failed to save shipment order or sign in');
                                console.error('🚪 GATE 2: Error in password auth flow:', err);
                              }
                            }}
                            className="space-y-3"
                          >
                            <input
                              type="password"
                              id="inline-password"
                              placeholder="Password"
                              value={loginPassword}
                              onChange={(e) => {
                                setLoginPassword(e.target.value);
                                if (loginError) setLoginError(null);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                              required
                              disabled={loginLoading || authActions.isLoading}
                            />
                            <button
                              type="submit"
                              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={loginLoading || authActions.isLoading}
                            >
                              {authActions.isLoading ? 'Signing in...' : 'Sign in'}
                            </button>
                          </form>
                        </div>
                        {/* Magic Link Option */}
                        <div className="space-y-3">
                          <div className="font-semibold text-base text-text-primary mb-1">CREATE ACCOUNT / SIGN IN</div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              
                              // GATE 1: SEND MAGIC LINK BUTTON
                              // ================================
                              // Before sending magic link, we must save shipment order to ensure
                              // fulfillment data is captured before user proceeds to payment
//                               console.log('🚪 GATE 1: Send Magic Link - Starting validation and save process');
                              
                              if (!loginEmail.trim()) {
                                setLoginError('Email is required');
                                return;
                              }
                              
                              // Validate shipping address is complete
                              if (!validateShippingStage()) {
                                setLoginError('Please complete all shipping address fields before proceeding');
                                return;
                              }
                              
                              setLoginLoading(true);
                              setLoginError(null);
                              
                              try {
                                // Step 1: Save shipment order BEFORE sending magic link
//                                 console.log('🚪 GATE 1: Preparing shipment order data...');
                                const shipmentData = prepareShipmentOrderData();
                                const token = (userSession as any)?.access_token || jwt;
                                
                                if (!token) {
                                  setLoginError('Authentication required to save shipment order');
                                  return;
                                }
                                
//                                                                 console.log('🚪 GATE 1: Saving shipment order before magic link...');
                                const shipmentResult = await saveShipmentOrderMutation.mutateAsync({ shipmentData, token });

                                // Step 2: Send magic link only after successful save
//                                 console.log('🚪 GATE 1: Shipment order saved, sending magic link...');
                                const emailToUse = (visitorData?.email || customerInfoQuery.data?.email) || loginEmail;
                                const redirectParams = new URLSearchParams({
                                  mode: 'user',
                                  stage: currentStage,
                                  ...(router.query.success && { success: router.query.success as string }),
                                  ...(router.query.canceled && { canceled: router.query.canceled as string })
                                });
                                const redirectUrl = `${window.location.origin}/checkout?${redirectParams.toString()}`;
                                const { error } = await supabaseAnon.auth.signInWithOtp({
                                  email: emailToUse.trim(),
                                  options: { emailRedirectTo: redirectUrl }
                                });
                                
                                if (error) {
                                  setLoginError(error.message);
//                                   console.log('🚪 GATE 1: Magic link send failed:', error.message);
                                } else {
                                  setLoginLinkSent(true);
//                                   console.log('🚪 GATE 1: Magic link sent successfully');
                                }
                              } catch (err) {
                                setLoginError('Failed to save shipment order or send magic link');
                                console.error('🚪 GATE 1: Error in magic link flow:', err);
                              } finally {
                                setLoginLoading(false);
                              }
                            }}
                            className="space-y-3"
                          >
                            <button
                              type="submit"
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={loginLoading || authActions.isLoading}
                            >
                              {loginLoading ? 'Sending...' : 'Send magic link'}
                            </button>
                          </form>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-green-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">Check your email</h3>
                      <p className="text-lg text-text-secondary mb-4">
                        We've sent a magic link <strong>from Supabase</strong> to <br />{(visitorData?.email || customerInfoQuery.data?.email) || loginEmail}. <br />Click the link to sign in and complete your checkout.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleReturnToInformation}
                  className="text-xl text-brand-secondary hover:underline"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary (Desktop) */}
        <div className="hidden lg:block">
          <div className="p-6 border rounded">
            <h3 className="text-xl font-bold mb-4">Order Summary</h3>
            {filteredItems.map((item) => {
              const { product, price } = getProductAndPrice(item);
              if (!product || !price) return null;
              const displayPrice = price.unit_amount || 0;
              let promoPrice = null;
              if (promo && (promo.percent_off || promo.amount_off)) {
                if (promo.percent_off) {
                  promoPrice = displayPrice * (1 - promo.percent_off / 100);
                } else if (promo.amount_off) {
                  promoPrice = displayPrice - promo.amount_off;
                }
              }
              return (
                <div key={item.priceId} className="flex justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-lg font-medium">{product.name}</div>
                    <div className="text-base text-text-secondary">Quantity: {item.quantity} · {price?.recurring ? 'Subscription' : 'One-time'}</div>
                  </div>
                  <div className="text-lg text-right">
                    {promoPrice && promoPrice < displayPrice ? (
                      <>
                        <div className="line-through text-text-secondary opacity-60">${((displayPrice * item.quantity) / 100).toFixed(2)}</div>
                        <div className="text-brand-secondary font-medium">${((promoPrice * item.quantity) / 100).toFixed(2)}</div>
                      </>
                    ) : (
                      <span>${((displayPrice * item.quantity) / 100).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Promo code reminder note */}
            {promo && promo.code && (
              <div className="text-lg text-brand-secondary bg-brand-secondary/10 rounded px-3 py-2 mb-4 text-center font-medium">
                <div className="space-y-1">
                  <p>
                    Use promo code <span className="font-bold">{promo.code}</span> at checkout.
                  </p>
                  {promo.duration && (
                    <p>
                      {promo.duration === 'once' 
                        ? 'Applies to first month.'
                        : promo.duration === 'forever'
                        ? 'Good forever.'
                        : promo.duration === 'repeating' && promo.duration_in_months
                        ? `Good for ${promo.duration_in_months} months of subscription.`
                        : null
                      }
                    </p>
                  )}
                  {promo.first_time_transaction && (
                    <p>
                      Good for first time orders.
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Account creation reminder note */}
            {!(visitorData?.has_account || userSession) && (
            <div className="text-lg text-blue-600 bg-blue-50 rounded px-3 py-2 mb-4 text-center font-medium">
              <div className="space-y-1">
                <p>
                  Create an account to <span className="font-bold">manage subscriptions</span>.
                  <br/>Modify or cancel any time.
                </p>
              </div>
            </div>  
            )}
            
            <hr className="my-4" />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>
                {(() => {
                  const subtotal = filteredItems.reduce((sum, item) => {
                    const { price } = getProductAndPrice(item);
                    return sum + ((price?.unit_amount || 0) * item.quantity);
                  }, 0);
                  let promoSubtotal = null;
                  if (promo && (promo.percent_off || promo.amount_off)) {
                    if (promo.percent_off) {
                      promoSubtotal = subtotal * (1 - promo.percent_off / 100);
                    } else if (promo.amount_off) {
                      promoSubtotal = subtotal - promo.amount_off * filteredItems.length;
                    }
                  }
                  return promoSubtotal && promoSubtotal < subtotal ? (
                    <>
                      <span className="line-through text-text-secondary opacity-60 mr-2">${(subtotal / 100).toFixed(2)}</span>
                      <span className="text-brand-secondary">${(promoSubtotal / 100).toFixed(2)}</span>
                    </>
                  ) : (
                    <span>${(subtotal / 100).toFixed(2)}</span>
                  );
                })()}
              </span>
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
              <h3 className="text-lg font-semibold text-text-primary mb-3">Create an account?</h3>
              <p className="text-lg text-text-secondary mb-6">
                We noticed you have contact information saved. Would you like to create an account to track your orders and manage your subscriptions?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowGuestConfirmation(false);
                    setCheckoutMode('user');
                    setShowInlineLogin(true);
                    setCheckoutLoading(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                >
                  Yes, create account
                </button>
                <button
                  onClick={async () => {
                    // GATE 3: NO, CONTINUE AS GUEST BUTTON
                    // ====================================
                    // Before proceeding to guest checkout, we must save shipment order to ensure
                    // fulfillment data is captured before user proceeds to payment
//                     console.log('🚪 GATE 3: Continue as Guest - Starting validation and save process');
                    
                    setShowGuestConfirmation(false);
                    setCheckoutLoading(true);
                    
                    try {
                      // Step 1: Validate shipping address is complete
                      if (!validateShippingStage()) {
                        alert('Please complete all shipping address fields before proceeding');
                        setCheckoutLoading(false);
                        return;
                      }
                      
                      // Step 2: Save shipment order BEFORE proceeding to payment
//                       console.log('🚪 GATE 3: Preparing shipment order data...');
                      const shipmentData = prepareShipmentOrderData();
                      const token = userSession?.access_token || jwt;
                      
                      if (!token) {
                        alert('Authentication required to save shipment order');
                        setCheckoutLoading(false);
                        return;
                      }
                      
//                       console.log('🚪 GATE 3: Saving shipment order before guest checkout...');
                      const shipmentResult = await saveShipmentOrderMutation.mutateAsync({ shipmentData, token });
                      // Prepare next-leg parameters
                      const currentFlow = (checkoutFlowQuery.data as any) || { flow: 'single', type: 'sub' };
                      const targetType: 'sub' | 'oneoff' = 'sub';
                      const stripeMode: 'subscription' | 'payment' = 'subscription';
                      const filteredItems = items.filter(ci => {
                        const { price } = getProductAndPrice(ci);
                        return !!price?.recurring;
                      });
                      const successRedirect = typeof window !== 'undefined' ? `${window.location.origin}/checkout?mode=${checkoutMode}&flow=${currentFlow.flow || 'single'}&type=${targetType}&success=1` : undefined;
                      const cancelRedirect = typeof window !== 'undefined' ? `${window.location.origin}/checkout?mode=${checkoutMode}&flow=${currentFlow.flow || 'single'}&type=${targetType}&canceled=1` : undefined;
                      
                      // Step 3: Proceed to checkout only after successful save
//                       console.log('🚪 GATE 3: Shipment order saved, proceeding to guest checkout...');
                      await checkoutSessionMutation.mutateAsync({
                        items: filteredItems,
                        customerEmail: visitorData?.email || customerInfoQuery.data?.email || '',
                        visitorId: visitorId || undefined,
                        checkoutMode: 'guest',
                        orderId: shipmentResult.order_id,
                        stripeMode,
                        successRedirect,
                        cancelRedirect,
                      });
//                       console.log('🚪 GATE 3: Guest checkout initiated successfully');
                      
                    } catch (error) {
                      console.error('🚪 GATE 3: Error in guest checkout flow:', error);
                      alert('Failed to save shipment order or proceed to checkout. Please try again.');
                    } finally {
                      setCheckoutLoading(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-lg"
                >
                  No, continue as visitor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
