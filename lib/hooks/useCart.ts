import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVisitorTracking } from './useVisitorTracking';

export type CartItem = {
  productId: string;
  priceId: string;
  quantity: number;
};

interface CartResponse {
  items: CartItem[];
}

// API functions
async function fetchCart(visitorUuid: string): Promise<CartResponse> {
  const response = await fetch(`/api/cart?visitor_uuid=${visitorUuid}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cart');
  }
  return response.json();
}

async function addItemToCart(visitorUuid: string, item: CartItem): Promise<CartResponse> {
  const response = await fetch(`/api/cart?visitor_uuid=${visitorUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item }),
  });
  if (!response.ok) {
    throw new Error('Failed to add item to cart');
  }
  return response.json();
}

async function updateItemQuantity(visitorUuid: string, priceId: string, quantity: number): Promise<CartResponse> {
  const response = await fetch(`/api/cart?visitor_uuid=${visitorUuid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, quantity }),
  });
  if (!response.ok) {
    throw new Error('Failed to update item quantity');
  }
  return response.json();
}

async function removeItemFromCart(visitorUuid: string, priceId: string): Promise<CartResponse> {
  const response = await fetch(`/api/cart?visitor_uuid=${visitorUuid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });
  if (!response.ok) {
    throw new Error('Failed to remove item from cart');
  }
  return response.json();
}

async function clearCart(visitorUuid: string): Promise<CartResponse> {
  const response = await fetch(`/api/cart?visitor_uuid=${visitorUuid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error('Failed to clear cart');
  }
  return response.json();
}

/**
 * Cart hook that uses TanStack Query with optimistic updates
 * Only runs after visitor is fully created in the database
 */
export function useCart() {
  const { visitorUuid, isVisitorReady } = useVisitorTracking();
  const queryClient = useQueryClient();

  const cartQueryKey = ['cart', visitorUuid];

  // Fetch cart data - only when visitor is ready
  const {
    data: cartData,
    isLoading,
    error,
  } = useQuery({
    queryKey: cartQueryKey,
    queryFn: () => {
      console.log('🛒 Pulling cart info for visitor:', visitorUuid);
      return fetchCart(visitorUuid!);
    },
    enabled: isVisitorReady && Boolean(visitorUuid),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
  });

  // Add item mutation with optimistic update
  const addItemMutation = useMutation({
    mutationFn: (item: CartItem) => addItemToCart(visitorUuid!, item),
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKey });

      // Snapshot the previous value
      const previousCart = queryClient.getQueryData<CartResponse>(cartQueryKey);

      // Optimistically update the cache
      queryClient.setQueryData<CartResponse>(cartQueryKey, (old) => {
        if (!old) return { items: [newItem] };
        
        const existingIndex = old.items.findIndex(i => i.priceId === newItem.priceId);
        if (existingIndex >= 0) {
          // Update existing item quantity
          const updatedItems = old.items.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity + newItem.quantity }
              : item
          );
          return { items: updatedItems };
        } else {
          // Add new item
          console.log(`🛒 Adding item (mtn)for visitor ${visitorUuid!}:`, newItem);
          return { items: [...old.items, newItem] };
        }
      });

      return { previousCart };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  // Update quantity mutation with optimistic update
  const updateQuantityMutation = useMutation({
    mutationFn: ({ priceId, quantity }: { priceId: string; quantity: number }) =>
      updateItemQuantity(visitorUuid!, priceId, quantity),
    onMutate: async ({ priceId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(cartQueryKey);

      queryClient.setQueryData<CartResponse>(cartQueryKey, (old) => {
        if (!old) return { items: [] };

        const updatedItems = old.items
          .map(item => item.priceId === priceId ? { ...item, quantity } : item)
          .filter(item => item.quantity > 0); // Remove items with 0 quantity
        console.log(`🛒 Updating quantity (mtn)for visitor ${visitorUuid!}:`, priceId, quantity);
        return { items: updatedItems };
      });

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  // Remove item mutation with optimistic update
  const removeItemMutation = useMutation({
    mutationFn: (priceId: string) => removeItemFromCart(visitorUuid!, priceId),
    onMutate: async (priceId) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(cartQueryKey);
      
      queryClient.setQueryData<CartResponse>(cartQueryKey, (old) => {
        if (!old) return { items: [] };
        console.log(`🛒 Removing item (mtn)for visitor ${visitorUuid!}:`, priceId);
        return { items: old.items.filter(item => item.priceId !== priceId) };
      });

      return { previousCart };
    },
    onError: (err, priceId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  // Clear cart mutation with optimistic update
  const clearCartMutation = useMutation({
    mutationFn: () => clearCart(visitorUuid!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(cartQueryKey);

      queryClient.setQueryData<CartResponse>(cartQueryKey, { items: [] });

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  // Helper functions
  const addItem = (item: CartItem) => {
    if (!isVisitorReady) {
      console.warn('Cannot add item to cart: visitor not ready');
      return;
    }
    console.log('🛒 Updating cart - adding item:', item);
    addItemMutation.mutate(item);
  };

  const updateQuantity = (priceId: string, quantity: number) => {
    if (!isVisitorReady) {
      console.warn('Cannot update cart: visitor not ready');
      return;
    }
    console.log('🛒 Updating cart - changing quantity:', { priceId, quantity });
    updateQuantityMutation.mutate({ priceId, quantity });
  };

  const removeItem = (priceId: string) => {
    if (!isVisitorReady) {
      console.warn('Cannot remove item from cart: visitor not ready');
      return;
    }
    console.log('🛒 Updating cart - removing item:', priceId);
    removeItemMutation.mutate(priceId);
  };

  const clearItems = () => {
    if (!isVisitorReady) {
      console.warn('Cannot clear cart: visitor not ready');
      return;
    }
    console.log('🛒 Updating cart - clearing all items');
    clearCartMutation.mutate();
  };

  return {
    // Data
    items: cartData?.items || [],
    
    // Status
    isLoading: isLoading && isVisitorReady,
    error,
    isVisitorReady,
    
    // Actions
    addItem,
    updateQuantity,
    removeItem,
    clearCart: clearItems,
    
    // Mutation states
    isAddingItem: addItemMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
  };
} 