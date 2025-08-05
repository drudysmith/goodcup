import React, { createContext, useContext, useState, useCallback } from 'react';

interface CartAnimationState {
  isVisible: boolean;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
}

interface CartAnimationContextType {
  animationState: CartAnimationState;
  triggerAnimation: (startPos: { x: number; y: number }, endPos: { x: number; y: number }) => void;
  hideAnimation: () => void;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) {
    throw new Error('useCartAnimation must be used within a CartAnimationProvider');
  }
  return context;
};

interface CartAnimationProviderProps {
  children: React.ReactNode;
}

export const CartAnimationProvider: React.FC<CartAnimationProviderProps> = ({ children }) => {
  const [animationState, setAnimationState] = useState<CartAnimationState>({
    isVisible: false,
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 }
  });

  const triggerAnimation = useCallback((startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    setAnimationState({
      isVisible: true,
      startPosition: startPos,
      endPosition: endPos
    });
  }, []);

  const hideAnimation = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  return (
    <CartAnimationContext.Provider value={{
      animationState,
      triggerAnimation,
      hideAnimation
    }}>
      {children}
    </CartAnimationContext.Provider>
  );
}; 
