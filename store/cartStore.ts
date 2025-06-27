import { Store } from '@tanstack/store';
import React from 'react';

export type CartItem = {
  productId: string;
  priceId: string;
  quantity: number;
};

interface CartState {
  items: CartItem[];
}

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (priceId: string) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  clearCart: () => void;
}

// localStorage persistence utilities
const STORAGE_KEY = 'cart-storage';

const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Handle both old Zustand format {state: {items: []}} and new direct format {items: []}
    if (parsed.state && Array.isArray(parsed.state.items)) {
      return parsed.state.items;
    }
    if (parsed.items && Array.isArray(parsed.items)) {
      return parsed.items;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn('Failed to load cart from localStorage:', error);
    return [];
  }
};

const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Save in the same format as Zustand persist middleware
    const dataToStore = {
      state: { items },
      version: 0
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.warn('Failed to save cart to localStorage:', error);
  }
};

// Initialize cart store with data from localStorage
const initialItems = loadCartFromStorage();

// Create the TanStack store
const cartStore = new Store<CartState>({
  items: initialItems,
});

// Subscribe to store changes and persist to localStorage
cartStore.subscribe(() => {
  const state = cartStore.state;
  saveCartToStorage(state.items);
});

// Cart action implementations
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

// Create the hook that matches the Zustand API
export const useCartStore = <T>(selector: (state: CartState & CartActions) => T): T => {
  const [state, setState] = React.useState(() => {
    const currentState = cartStore.state;
    return selector({
      ...currentState,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    });
  });

  React.useEffect(() => {
    const unsubscribe = cartStore.subscribe(() => {
      const currentState = cartStore.state;
      const newValue = selector({
        ...currentState,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      });
      setState(newValue);
    });

    return unsubscribe;
  }, [selector]);

  return state;
}; 