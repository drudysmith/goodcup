import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartStore, validateCartItems } from '../../store/cartStore';
import { supabaseAnon } from '../supabaseClient';
import { useSupabaseSession } from '../queries/sessionQueries';

interface VisitorData {
  name: string | null;
  email: string | null;
  phone: string | null;
  cart: object | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  has_account?: boolean;
}

interface VisitorContextType {
  visitorId: string | null;
  jwt: string | null;
  visitorData: VisitorData | null;
  isReady: boolean;
  userCartReady: boolean;
  updateVisitorIdentity: (newVisitorId: string, newJwt: string, newVisitorData: VisitorData) => void;
  syncCartToDatabase: (cart: object, jwtToken: string) => Promise<void>;
  hydrateCartFromDatabase: (cartData: any[], products?: any[]) => void;
}

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

interface VisitorProviderProps {
  children: ReactNode;
}

// Visitor data fetching functions
const fetchVisitorInit = async (visitorId: string) => {
  const response = await fetch('/api/visitor/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visitor_id: visitorId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to register visitor: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

const fetchVisitorValidate = async (jwt: string) => {
  const response = await fetch('/api/visitor/validate', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to validate visitor: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

// User cart data fetching function
const fetchUserCart = async (session: any) => {
  if (!session?.access_token) {
    throw new Error('No session token available');
  }

  const response = await fetch('/api/user/cart', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user cart: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export const VisitorProvider: React.FC<VisitorProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [skipVisitor, setSkipVisitor] = useState<boolean | null>(null);
  const [userCartReady, setUserCartReady] = useState<boolean>(false);
  // Initialize visitor ID directly from localStorage to avoid timing races
  const [visitorId, setVisitorId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('visitor_id') || '';
    }
    return '';
  });

  // Monitor session state for userCartReady flag
  const sessionQuery = useSupabaseSession();

  // Effect to set userCartReady based on session state
  useEffect(() => {
    const hasValidSession = !!sessionQuery.data?.user?.id;
    setUserCartReady(hasValidSession);
    
    // Log state transition for debugging
    console.log('[VisitorProvider] userCartReady:', hasValidSession, 'skipVisitor:', skipVisitor);
  }, [sessionQuery.data?.user?.id]);

  // User cart query - only enabled when userCartReady is true
  const userCartQuery = useQuery({
    queryKey: ['userCart', sessionQuery.data?.user?.id],
    queryFn: () => fetchUserCart(sessionQuery.data),
    enabled: userCartReady && !!sessionQuery.data?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Effect to hydrate cart when user cart data is loaded
  useEffect(() => {
    if (!userCartReady) return;
    
    const userData = userCartQuery.data;
    if (userData && userData.cart && Array.isArray(userData.cart)) {
      hydrateCartFromDatabase(userData.cart);
    }
  }, [userCartQuery.data, userCartReady]);

  // Before generating a visitor ID, check if a Supabase user session exists.
  // When a session is detected we set `skipVisitor` so the rest of the
  // visitor effects (ID generation, JWT fetch, cart sync) are bypassed.
  useEffect(() => {
    const init = async () => {
      // Step 1: Generate visitor ID if none exists (already loaded in useState)
      if (typeof window !== 'undefined' && !visitorId) {
        const newVisitorId = uuidv4();
        localStorage.setItem('visitor_id', newVisitorId);
        setVisitorId(newVisitorId);
      }

      // Step 2: Check for session status
      const { data: { session } } = await supabaseAnon.auth.getSession();
      if (session) {
        setSkipVisitor(true);
      } else {
        setSkipVisitor(false);
      }

      // Step 3: Add console log for verification
      console.log('[VisitorProvider] Visitor ID:', visitorId || 'generating...', 'skipVisitor:', session ? true : false);
    };

    init();
  }, []);


  // Cart sync state and refs
  const cartSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedCartRef = useRef<string>('');

  // User cart sync state and refs
  const userCartSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedUserCartRef = useRef<string>('');

  // Get cart items from store
  const cartItems = useCartStore((state) => state.items);
  const cartActions = useCartStore((state) => ({ clearCart: state.clearCart, addItem: state.addItem }));

  // Query for visitor data - handles both init and validate flows
  const visitorQuery = useQuery({
    queryKey: ['visitor', visitorId],
    queryFn: async () => {
      if (!visitorId) return null;

      const existingJwt = localStorage.getItem('visitor_jwt');
      
      if (!existingJwt) {
        // Module 2: Registration flow - New visitor needs JWT
        const initData = await fetchVisitorInit(visitorId);
        localStorage.setItem('visitor_jwt', initData.jwt);
        
        return {
          jwt: initData.jwt,
          visitorData: null,
          needsReload: false
        };
      } else {
        // Module 3: Validation flow - Returning visitor with JWT
        try {
          const validateData = await fetchVisitorValidate(existingJwt);
          
          return {
            jwt: existingJwt,
            visitorData: {
              name: validateData.visitor.name,
              email: validateData.visitor.email,
              phone: validateData.visitor.phone,
              cart: validateData.visitor.cart,
              street: validateData.visitor.street,
              unit: validateData.visitor.unit,
              city: validateData.visitor.city,
              state: validateData.visitor.state,
              postal_code: validateData.visitor.postal_code,
              country: validateData.visitor.country,
              has_account: validateData.visitor.has_account
            },
            needsReload: false
          };
        } catch (error) {
          // Invalid JWT - clear and restart
          localStorage.removeItem('visitor_id');
          localStorage.removeItem('visitor_jwt');
          
          // Generate new visitor and restart flow
          const newVisitorId = uuidv4();
          localStorage.setItem('visitor_id', newVisitorId);
          
          return {
            jwt: null,
            visitorData: null,
            needsReload: true
          };
        }
      }
    },
    enabled: !!visitorId && skipVisitor === false,
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error to prevent loops
      if (error?.message?.includes('Failed to validate visitor')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle reload for invalid JWT case
  useEffect(() => {
    if (skipVisitor) return;
    if (visitorQuery.data?.needsReload) {
      window.location.reload();
    }
  }, [visitorQuery.data?.needsReload, skipVisitor]);

  // Cart sync mutation
  const cartSyncMutation = useMutation({
    mutationFn: async ({ cart, jwtToken }: { cart: object; jwtToken: string }) => {
      const response = await fetch('/api/visitor/updateCart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync cart: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate visitor query to refresh data
      queryClient.invalidateQueries({ queryKey: ['visitor', visitorId] });
    },
    onError: (error) => {
      // Error handling without logging
    },
  });

  // User cart sync mutation
  const userCartSyncMutation = useMutation({
    mutationFn: async ({ cart, sessionToken }: { cart: object; sessionToken: string }) => {
      const response = await fetch('/api/user/cart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync user cart: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate user cart query to refresh data
      queryClient.invalidateQueries({ queryKey: ['userCart', sessionQuery.data?.user?.id] });
    },
    onError: (error) => {
      // Error handling without logging
    },
  });

  // Function to hydrate cart store from database data with validation
  const hydrateCartFromDatabase = (cartData: any[], products?: any[]) => {
    if (!Array.isArray(cartData) || cartData.length === 0) {
      return;
    }

    // Clear current cart first to avoid duplicates
    cartActions.clearCart();
    
    // Convert database data to CartItem format
    const cartItems = cartData
      .filter((item: any) => item.priceId && item.quantity)
      .map((item: any) => ({
        productId: item.productId || '',
        priceId: item.priceId,
        quantity: item.quantity
      }));
    
    // If products are available, validate items
    if (products && Array.isArray(products)) {
      const { validItems, invalidItems } = validateCartItems(cartItems, products);
      
      if (invalidItems.length > 0) {
        // Invalid items filtered out silently
      }
      
      // Add only valid items
      validItems.forEach((item) => {
        cartActions.addItem(item);
      });
      

    } else {
      // No products available for validation, add all items (will be validated later)
      cartItems.forEach((item) => {
        cartActions.addItem(item);
      });
      

    }
  };

  // Hydrate cart when visitor data changes
  useEffect(() => {
    if (skipVisitor) return;
    if (visitorQuery.data?.visitorData?.cart && Array.isArray(visitorQuery.data.visitorData.cart)) {
      hydrateCartFromDatabase(visitorQuery.data.visitorData.cart);
    }
  }, [visitorQuery.data?.visitorData?.cart, skipVisitor]);

  // Function to update visitor identity after merge/identify
  const updateVisitorIdentity = (newVisitorId: string, newJwt: string, newVisitorData: VisitorData) => {

    // Update localStorage
    localStorage.setItem('visitor_id', newVisitorId);
    localStorage.setItem('visitor_jwt', newJwt);

    // Invalidate and refetch visitor data with new identity
    queryClient.setQueryData(['visitor', newVisitorId], {
      jwt: newJwt,
      visitorData: newVisitorData,
      needsReload: false
    });
    
    // Hydrate cart from merged visitor data
    if (newVisitorData.cart && Array.isArray(newVisitorData.cart)) {
      hydrateCartFromDatabase(newVisitorData.cart);
    }
  };

  // Function to sync cart to database - now wraps the mutation
  const syncCartToDatabase = async (cart: object, jwtToken: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      cartSyncMutation.mutate(
        { cart, jwtToken },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
        }
      );
    });
  };

  // Effect to sync cart changes to database
  useEffect(() => {
    if (skipVisitor) return;
    const jwt = visitorQuery.data?.jwt;
    const isReady = !visitorQuery.isLoading && !visitorQuery.isError;
    
    // Only sync if visitor is authenticated and ready
    if (!isReady || !jwt || !visitorId) {
      return;
    }

    // Convert cart items to JSON string for comparison
    const currentCartJson = JSON.stringify(cartItems);
    
    // Skip if cart hasn't changed
    if (currentCartJson === lastSyncedCartRef.current) {
      return;
    }

    // Clear existing timeout
    if (cartSyncTimeoutRef.current) {
      clearTimeout(cartSyncTimeoutRef.current);
    }

    // Debounce cart sync by 1 second to avoid rapid API calls
    cartSyncTimeoutRef.current = setTimeout(() => {
      lastSyncedCartRef.current = currentCartJson;
      cartSyncMutation.mutate({ cart: cartItems, jwtToken: jwt });
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (cartSyncTimeoutRef.current) {
        clearTimeout(cartSyncTimeoutRef.current);
      }
    };
  }, [cartItems, visitorQuery.data?.jwt, visitorId, visitorQuery.isLoading, visitorQuery.isError, skipVisitor]);

  // Effect to sync user cart changes to database
  useEffect(() => {
    if (!userCartReady) return;
    const sessionToken = sessionQuery.data?.access_token;
    const isSessionReady = !sessionQuery.isLoading && !sessionQuery.isError;
    
    // Only sync if user session is authenticated and ready
    if (!isSessionReady || !sessionToken || !sessionQuery.data?.user?.id) {
      return;
    }

    // Convert cart items to JSON string for comparison
    const currentCartJson = JSON.stringify(cartItems);
    
    // Skip if cart hasn't changed
    if (currentCartJson === lastSyncedUserCartRef.current) {
      return;
    }

    // Clear existing timeout
    if (userCartSyncTimeoutRef.current) {
      clearTimeout(userCartSyncTimeoutRef.current);
    }

    // Debounce cart sync by 1 second to avoid rapid API calls
    userCartSyncTimeoutRef.current = setTimeout(() => {
      lastSyncedUserCartRef.current = currentCartJson;
      userCartSyncMutation.mutate({ cart: cartItems, sessionToken });
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (userCartSyncTimeoutRef.current) {
        clearTimeout(userCartSyncTimeoutRef.current);
      }
    };
  }, [cartItems, sessionQuery.data?.access_token, sessionQuery.data?.user?.id, sessionQuery.isLoading, sessionQuery.isError, userCartReady]);

  // Derive context values from query state
  let isReady = false;
  if (skipVisitor === true) {
    isReady = true;
  } else if (skipVisitor === false) {
    isReady = !visitorQuery.isLoading && !visitorQuery.isError && !!visitorQuery.data;
  }
  const contextValue: VisitorContextType = {
    visitorId: visitorId || null, // Always expose visitor ID regardless of skipVisitor
    jwt: skipVisitor ? null : visitorQuery.data?.jwt || null,
    visitorData: skipVisitor ? null : visitorQuery.data?.visitorData || null,
    isReady,
    userCartReady,
    updateVisitorIdentity,
    syncCartToDatabase,
    hydrateCartFromDatabase,
  };

  return (
    <VisitorContext.Provider value={contextValue}>
      {children}
    </VisitorContext.Provider>
  );
};



export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (context === undefined) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  
  // Smart console log in the hook to show what we have
  /*console.log('🔍 useVisitor hook called - Current state:', {
    visitorId: context.visitorId,
    jwt: context.jwt ? '***' + context.jwt.slice(-8) : null,
    visitorData: context.visitorData ? { 
      hasName: !!context.visitorData.name,
      hasEmail: !!context.visitorData.email, 
      hasPhone: !!context.visitorData.phone,
      hasCart: !!context.visitorData.cart 
    } : null,
    isReady: context.isReady
  });*/
  
  return context;
}; 