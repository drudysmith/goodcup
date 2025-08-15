'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  metadata?: { [key: string]: string };
}

interface IngredientsListModalProps {
  open: boolean;
  onClose: () => void;
  product: StripeProduct | null;
  position?: 'bottom' | 'center' | 'top-left' | 'top-right' | 'custom' | 'cursor';
  customPosition?: React.CSSProperties;
  cursorPosition?: { x: number; y: number };
  className?: string;
}

const IngredientsListModal: React.FC<IngredientsListModalProps> = ({ 
  open, 
  onClose, 
  product,
  position = 'cursor',
  customPosition,
  cursorPosition,
  className = ''
}) => {
  if (!product) return null;

  // Parse ingredients from metadata
  const ingredientsString = product.metadata?.['ingredients'] || '';
  const ingredients = ingredientsString
    .split(',')
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 0);

  const getPositionClasses = () => {
    switch (position) {
      case 'center':
        return 'fixed inset-0 flex items-center justify-center';
      case 'top-left':
        return 'fixed top-4 left-4';
      case 'top-right':
        return 'fixed top-4 right-4';
      case 'bottom':
        return 'fixed inset-x-0 bottom-0 mx-auto';
      case 'custom':
        return 'fixed';
      case 'cursor':
        return 'fixed';
      default:
        return 'fixed';
    }
  };

  const getPositionStyle = (): React.CSSProperties => {
    if (position === 'custom') {
      return customPosition || {};
    }
    
    if (position === 'cursor' && cursorPosition) {
      // Position modal to the right of cursor, with some padding
      // Ensure it doesn't go off-screen
      const modalWidth = 320; // w-80 = 320px
      const modalHeight = 250; // estimated height
      const padding = 20;
      
      const x = Math.min(
        cursorPosition.x + padding,
        window.innerWidth - modalWidth - padding
      );
      
      const y = Math.min(
        Math.max(cursorPosition.y - modalHeight / 2, padding),
        window.innerHeight - modalHeight - padding
      );
      
      return {
        left: `${x}px`,
        top: `${y}px`,
      };
    }
    
    return {};
  };

  const containerClass = `${getPositionClasses()} ${className}`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Modal Content */}
          <motion.div
            className={containerClass}
            style={getPositionStyle()}
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.2 }}
          >
            <div className="bg-surface text-text-primary rounded-xl shadow-xl p-4 max-w-xs w-80 pointer-events-auto border border-neutral-border">
              {/* Close button */}
              <button
                aria-label="Close ingredients list"
                onClick={onClose}
                className="absolute top-2 right-2 bg-neutral-muted-bg text-text-tertiary hover:text-text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm"
              >
                ✕
              </button>

              {/* Header */}
              <div className="mb-3 pr-6">
                <h3 className="text-lg font-semibold text-text-primary">
                  {product.name}
                </h3>
                <p className="text-sm text-text-secondary">Ingredients</p>
              </div>

              {/* Ingredients List */}
              <div className="space-y-1">
                {ingredients.length > 0 ? (
                  ingredients.map((ingredient, index) => (
                    <div 
                      key={index}
                      className="text-sm text-text-secondary bg-neutral-muted-bg rounded-md px-2 py-1"
                    >
                      {ingredient}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-tertiary italic">
                    No ingredients information available
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default IngredientsListModal;
