import { useState, useCallback } from 'react';

export interface FlyToCartAnimation {
  id: string;
  productImage: string;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  startSize: { width: number; height: number };
}

export interface FlyToCartData {
  productImage: string;
  startElement: HTMLElement;
  skipAnimation?: boolean;
}

export const useFlyToCart = () => {
  const [activeAnimations, setActiveAnimations] = useState<FlyToCartAnimation[]>([]);

  const triggerAnimation = useCallback((data: FlyToCartData): Promise<void> => {
    return new Promise((resolve) => {
      if (data.skipAnimation) {
        resolve();
        return;
      }

      // Find cart icon
      const cartIcon = document.querySelector('[data-cart-icon]');
      if (!cartIcon) {
        console.warn('Cart icon not found for fly-to-cart animation');
        resolve();
        return;
      }

      // Get positions
      const startRect = data.startElement.getBoundingClientRect();
      const endRect = cartIcon.getBoundingClientRect();

      // Create animation data
      const animation: FlyToCartAnimation = {
        id: `fly-${Date.now()}-${Math.random()}`,
        productImage: data.productImage,
        startPosition: { 
          x: startRect.left + startRect.width / 2, 
          y: startRect.top + startRect.height / 2 
        },
        endPosition: { 
          x: endRect.left + endRect.width / 2, 
          y: endRect.top + endRect.height / 2 
        },
        startSize: { 
          width: Math.min(startRect.width * 0.8, 64), 
          height: Math.min(startRect.height * 0.8, 64) 
        }
      };

      // Add animation to active list
      setActiveAnimations(prev => [...prev, animation]);

      // Resolve after animation duration
      setTimeout(resolve, 800);
    });
  }, []);

  const removeAnimation = useCallback((animationId: string) => {
    setActiveAnimations(prev => prev.filter(anim => anim.id !== animationId));
  }, []);

  const clearAllAnimations = useCallback(() => {
    setActiveAnimations([]);
  }, []);

  return {
    activeAnimations,
    triggerAnimation,
    removeAnimation,
    clearAllAnimations
  };
}; 