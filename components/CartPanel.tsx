import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CartItem {
  productId: string;
  priceId: string;
  quantity: number;
}

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

interface CartActions {
  updateQuantity: (priceId: string, quantity: number) => void;
  removeItem: (priceId: string) => void;
}

interface CartPanelProps {
  items: CartItem[];
  cartClosing: boolean;
  onClose: () => void;
  cartActions: CartActions;
  products: StripeProduct[];
  isOpen: boolean;
}

const CartPanel: React.FC<CartPanelProps> = ({ 
  items, 
  cartClosing, 
  onClose, 
  cartActions,
  products,
  isOpen
}) => {
  // Visitor tracking functionality has been removed

  // Visitor contact tracking effects have been removed

  // Helper to get product/price info for cart items
  const getProductAndPrice = (item: CartItem) => {
    const product = products.find((p) => p.id === item.productId);
    const price = product?.prices.find((pr) => pr.id === item.priceId);
    return { product, price };
  };

  // Calculate total items in cart
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop - separate container */}
      <div 
        className={`fixed inset-0 bg-neutral-foreground transition-opacity duration-300 z-40 ${
          cartClosing ? 'backdrop-fade-out bg-opacity-70' : 'backdrop-fade-in bg-opacity-70'
        }`}
        onClick={onClose}
      />
      
      {/* Cart Panel - independent fixed element at viewport edge */}
      <div 
        className={`fixed top-0 right-0 z-50 bg-surface shadow-2xl flex flex-col ${
          cartClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
        style={{
          width: 'min(24rem, 90vw)', // Responsive width: 24rem on desktop, 90vw on mobile
          height: '100dvh', // Dynamic viewport height for mobile browser UI
          fallbacks: {
            height: '100vh' // Fallback for browsers without dvh support
          }
        } as React.CSSProperties}
      >
        {/* Header Banner */}
        <div className="bg-brand-dark text-surface-background px-6 py-3 text-center text-sm">
          "Wellness isn't a rush — but your order's almost ready."
        </div>

        {/* Header with Close button */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-neutral-border/10">
          <h3 className="text-xl font-medium text-text-primary">Your Experience</h3>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area with hidden scrollbar */}
        <div 
          className="flex-1 overflow-y-auto relative"
          style={{
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none',  /* Internet Explorer 10+ */
          }}
        >
          {/* Hide scrollbar for Chrome, Safari and Opera */}
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* Scroll shadow when content extends under anchored bottom */}
          <div className="scroll-shadow scroll-shadow-cart"></div>
          
          <div className="pb-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary opacity-70">Your experience is empty</p>
              </div>
            ) : (
              <>
                {/* Cart Items Group */}
                <motion.div 
                  className="mb-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 1 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08
                      }
                    }
                  }}
                >
                  {items.map((item, index) => {
                    const { product, price } = getProductAndPrice(item);
                    if (!product || !price) return null;

                    return (
                      <motion.div 
                        key={item.priceId} 
                        className="cart-item"
                        style={{ 
                          padding: '12px 16px'
                        }}
                        variants={{
                          hidden: { 
                            opacity: 0, 
                            x: 50 
                          },
                          visible: { 
                            opacity: 1, 
                            x: 0,
                            transition: {
                              type: "tween",
                              ease: "easeOut",
                              duration: 0.4
                            }
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Product Image - larger, aligned with content */}
                          <div className="flex-shrink-0" style={{ width: '80px', height: '80px' }}>
                            {product.images[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            )}
                          </div>

                          {/* Product Info - flex space */}
                          <div className="flex-1 flex flex-col justify-between h-20">
                            <div>
                              <h4 className="text-text-primary text-sm leading-tight font-medium">
                                {product.name}
                              </h4>
                              <p className="text-xs text-text-tertiary mt-1">
                                {price.recurring ? `refill ships every 4 weeks` : product.description || '30 servings'}
                              </p>
                            </div>
                            
                            {/* Quantity and pricing row - aligned to bottom */}
                            <div className="flex items-center justify-between">
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-1">
                                <button
                                  className="w-6 h-6 rounded-full border border-neutral-border flex items-center justify-center hover:bg-surface transition-colors text-text-secondary text-xs"
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      cartActions.updateQuantity(item.priceId, item.quantity - 1);
                                    } else {
                                      cartActions.removeItem(item.priceId);
                                    }
                                  }}
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-sm font-medium text-text-primary">
                                  {item.quantity}
                                </span>
                                <button
                                  className="w-6 h-6 rounded-full border border-neutral-border flex items-center justify-center hover:bg-surface transition-colors text-text-secondary text-xs"
                                  onClick={() => cartActions.updateQuantity(item.priceId, item.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>

                              {/* Pricing */}
                              <div className="text-right">
                                <span className="text-xs text-text-tertiary line-through">
                                  {price.unit_amount !== null ? ((price.unit_amount * item.quantity * 1.15) / 100).toFixed(2) : 'N/A'}
                                </span>
                                <span className="text-sm text-text-primary font-medium">
                                  {price.unit_amount !== null ? ((price.unit_amount * item.quantity) / 100).toFixed(2) : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Delete Button - aligned with top */}
                          <button
                            className="w-5 h-5 flex items-center justify-center text-text-secondary hover:opacity-100 transition-opacity mt-1"
                            onClick={() => cartActions.removeItem(item.priceId)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Fixed Bottom Checkout Section - Anchored to bottom with safe area support and proper padding */}
        {items.length > 0 && (
          <div 
            className="flex-shrink-0 border-t border-neutral-border/10 bg-surface p-6 pb-8"
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 16px))'
            }}
          >
            {/* Subtotal and Shipping */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Subtotal</span>
                <div className="text-right">
                  <span className="text-sm text-text-tertiary line-through mr-2">
                    {totalItems > 0 ? ((items.reduce((sum, item) => {
                      const { price } = getProductAndPrice(item);
                      return sum + ((price?.unit_amount || 0) * item.quantity);
                    }, 0) * 1.15) / 100).toFixed(2) : '0.00'}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {totalItems > 0 ? (items.reduce((sum, item) => {
                      const { price } = getProductAndPrice(item);
                      return sum + ((price?.unit_amount || 0) * item.quantity);
                    }, 0) / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Shipping</span>
                <span className="text-sm font-medium text-text-primary">Free</span>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="flex justify-center mb-3">
              <button 
                className="cupgrade-button px-8 py-2 text-sm"
                style={{ 
                  width: 'auto',
                  minWidth: '180px',
                  maxWidth: '200px'
                }}
                onClick={() => {
                  onClose();
                  window.location.href = '/checkout';
                }}
              >
                cupgrade now
              </button>
            </div>

            {/* Microcopy */}
            <p className="text-xs text-center text-text-secondary opacity-60">
              handmade love in your life
            </p>
          </div>
        )}
      </div>

    </>
  );
};

export default CartPanel; 