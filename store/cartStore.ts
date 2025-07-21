import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';
import { LOG_ENABLED } from '../lib/utils/log';
import type { FlyToCartData } from '../lib/hooks/useFlyToCart';

export type CartItem = {
  productId: string;
  priceId: string;
  quantity: number;
};

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem, animationData?: FlyToCartData) => Promise<void>;
  removeItem: (priceId: string) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  clearCart: () => void;
}

// Helper functions for localStorage persistence
const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('cart-storage');
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Handle structured persist format: { state: { items: [] }, version: 0 }
    if (parsed.state && Array.isArray(parsed.state.items)) {
      return parsed.state.items;
    }
    // Handle direct array format
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    if (LOG_ENABLED) {
    console.error('Error loading cart from storage:', error);
    }
    return [];
  }
};

const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Save in structured persist format for consistency
    const persistData = {
      state: { items },
      version: 0
    };
    localStorage.setItem('cart-storage', JSON.stringify(persistData));
  } catch (error) {
        if (LOG_ENABLED) {
    console.error('Error saving cart to storage:', error);
        }
  }
};

// Initialize store with items from localStorage
const initialItems = loadCartFromStorage();

// Create TanStack Store - only for data state
const cartStore = new Store({
  items: initialItems,
});

// Action functions that manipulate the store
const addItem = async (item: CartItem, animationData?: FlyToCartData): Promise<void> => {
  // If animation data is provided, trigger the animation first
  if (animationData && !animationData.skipAnimation) {
    // Get the global fly-to-cart trigger function from window (will be set by Layout)
    const triggerFlyToCart = (window as any).__triggerFlyToCart;
    if (triggerFlyToCart) {
      try {
        // Wait for animation to complete before updating cart
        await triggerFlyToCart(animationData);
      } catch (error) {
        if (LOG_ENABLED) {
          console.warn('Fly-to-cart animation failed:', error);
        }
      }
    }
  }

  // Update cart state (either immediately or after animation)
  cartStore.setState((state) => {
    // If item with same priceId exists, update quantity
    const existing = state.items.find((i) => i.priceId === item.priceId);
    if (existing) {
      return {
        items: state.items.map((i) =>
          i.priceId === item.priceId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        ),
      };
    }
    return { items: [...state.items, item] };
  });
};

const removeItem = (priceId: string) => {
  cartStore.setState((state) => ({
    items: state.items.filter((i) => i.priceId !== priceId),
  }));
};

const updateQuantity = (priceId: string, quantity: number) => {
  cartStore.setState((state) => ({
    items: state.items.map((i) =>
      i.priceId === priceId ? { ...i, quantity } : i
    ),
  }));
};

const clearCart = () => {
  cartStore.setState({ items: [] });
};

// Subscribe to changes and save to localStorage
cartStore.subscribe(() => {
  const state = cartStore.state;
  saveCartToStorage(state.items);
});

// Export hook that provides cart state and actions
export const useCartStore = <T>(selector: (state: CartState) => T) => {
  const storeState = useStore(cartStore);
  
  // Create the full state object with actions
  const fullState: CartState = {
    items: storeState.items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
  
  return selector(fullState);
}; 