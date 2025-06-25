import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  productId: string;
  priceId: string;
  quantity: number;
};

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (priceId: string) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
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
        }),
      removeItem: (priceId) =>
        set((state) => ({
          items: state.items.filter((i) => i.priceId !== priceId),
        })),
      updateQuantity: (priceId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.priceId === priceId ? { ...i, quantity } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage', // key in localStorage
    }
  )
); 