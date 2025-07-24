import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';
import { LOG_ENABLED } from '../lib/utils/log';

export type CartItem = {
  productId: string;
  priceId: string;
  quantity: number;
};

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

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (priceId: string) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  clearCart: () => void;
  validateAndCleanCart: (products: StripeProduct[]) => void;
}

// Validation function to check if cart items are valid against current product catalog
const validateCartItems = (items: CartItem[], products: StripeProduct[]): { validItems: CartItem[], invalidItems: CartItem[] } => {
  const validItems: CartItem[] = [];
  const invalidItems: CartItem[] = [];
  
  items.forEach((item) => {
    // Find the product
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      invalidItems.push(item);
      return;
    }
    
    // Find the price within the product
    const price = product.prices.find(pr => pr.id === item.priceId);
    if (!price) {
      invalidItems.push(item);
      return;
    }
    
    // Item is valid
    validItems.push(item);
  });
  
  return { validItems, invalidItems };
};

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
const addItem = (item: CartItem) => {
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

// New action to validate cart items against current product catalog and remove invalid items
const validateAndCleanCart = (products: StripeProduct[]) => {
  cartStore.setState((state) => {
    const { validItems, invalidItems } = validateCartItems(state.items, products);
    
    if (invalidItems.length > 0) {
      if (LOG_ENABLED) {
        console.log(`🧹 Cart validation: Removing ${invalidItems.length} invalid items:`, 
          invalidItems.map(item => ({ productId: item.productId, priceId: item.priceId }))
        );
      }
    }
    
    return { items: validItems };
  });
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
    validateAndCleanCart,
  };
  
  return selector(fullState);
};

// Export validation function for use in other contexts (like VisitorContext)
export { validateCartItems }; 