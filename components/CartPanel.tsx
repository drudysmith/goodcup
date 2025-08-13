import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LOG_ENABLED } from '../lib/utils/log';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';

interface CartItem {
  productId: string;
  priceId: string;
  quantity: number;
}

interface StripePrice {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring?: { 
    interval: string;
    interval_count?: number;
  };
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  prices: StripePrice[];
  metadata?: { [key: string]: string };
}

interface CartActions {
  updateQuantity: (priceId: string, quantity: number) => void;
  removeItem: (priceId: string) => void;
  updateItemPrice?: (oldPriceId: string, newPriceId: string) => void;
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

  // Helper to format recurring interval
  const formatRecurringInterval = (recurring: { interval: string; interval_count?: number }) => {
    const count = recurring.interval_count || 1;
    const interval = recurring.interval;
    
    if (count === 1) {
      return interval === 'week' ? 'week' : 
             interval === 'month' ? 'month' : 
             interval === 'year' ? 'year' : interval;
    } else {
      return interval === 'week' ? `${count} weeks` : 
             interval === 'month' ? `${count} months` : 
             interval === 'year' ? `${count} years` : `${count} ${interval}s`;
    }
  };

  // Calculate total items in cart
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const { data: promo } = useBannerPromoQuery();
  const [showDualCheckoutModal, setShowDualCheckoutModal] = useState(false);

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
          width: 'min(26rem, 90vw)', // Slightly wider on desktop, 90vw on mobile
          height: '100dvh', // Dynamic viewport height for mobile browser UI
          fallbacks: {
            height: '100vh' // Fallback for browsers without dvh support
          }
        } as React.CSSProperties}
      >
        {/* Header Banner */}
        <div className="bg-brand-dark text-surface-background px-6 py-3 text-center text-lg">
          "Wellness isn't rushed — but your order is!"
        </div>

        {/* Header with Close button */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-neutral-border/10 relative">
          <h3 className="text-3xl font-medium text-text-primary">Your Experience</h3>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Shadow cast by header onto scroll area */}
          <div className="absolute -bottom-3 left-0 right-0 h-3 bg-gradient-to-b from-black/15 via-black/8 to-transparent pointer-events-none z-10"></div>
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
          

          
           <div className="pb-4 relative z-0">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary opacity-70 text-lg">Your experience is empty</p>
              </div>
            ) : (
              <>
                {/* Cart Items Group */}
                <motion.div 
                  className="mb-4 overflow-visible relative z-10"
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
                    const displayPrice = price.unit_amount || 0;
                    let promoPrice = null;
                    if (promo && (promo.percent_off || promo.amount_off)) {
                      if (promo.percent_off) {
                        promoPrice = displayPrice * (1 - promo.percent_off / 100);
                      } else if (promo.amount_off) {
                        promoPrice = displayPrice - promo.amount_off;
                      }
                    }
                    return (
                      <motion.div 
                        key={`${item.productId}:${index}`} 
                        className="cart-item"
                        style={{ 
                          padding: '12px 16px',
                          overflow: 'hidden',
                          minHeight: '124px'
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
                        initial={false}
                      >
                        <div className="grid gap-y-2 w-full" style={{ gridTemplateColumns: '22% 48% 30%' }}>
                          {/* Row 1, Col 1: Image */}
                          <div style={{ width: '100%', height: '80px' }}>
                            {product.images[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            )}
                          </div>
                          {/* Row 1, Col 2-3: Title + short copy */}
                          <div className="row-start-1 col-start-2 col-span-2 self-center justify-self-start relative min-w-0 pl-3 md:pl-4">
                            <h4 className="text-text-primary text-lg leading-tight font-medium">
                              {product.name.split('(')[0].trim()}
                            </h4>
                            <p className="text-lg text-text-tertiary mt-1">
                              {product.metadata?.['short-copy'] || product.description || '30 servings'}
                            </p>
                          </div>
                          {/* Row 2, Col 1: Quantity controls */}
                          <div className="row-start-2 col-start-1 flex items-center gap-1 justify-self-center self-center">
                            <button
                              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-neutral-muted-bg flex items-center justify-center transition-colors text-text-primary text-base md:text-lg hover:opacity-80"
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
                            <span className="w-6 text-center text-lg font-medium text-text-primary">
                              {item.quantity}
                            </span>
                            <button
                              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-neutral-muted-bg flex items-center justify-center transition-colors text-text-primary text-base md:text-lg hover:opacity-80"
                              onClick={() => cartActions.updateQuantity(item.priceId, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          {/* Row 2, Col 2: Pricing (no wrap) */}
                          <div className="row-start-2 col-start-2 self-center justify-self-center text-center min-w-0">
                            <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden text-ellipsis justify-center">
                                {promoPrice && promoPrice < displayPrice ? (
                                  <>
                                    <span className="line-through text-xl text-text-secondary opacity-60">${((displayPrice * item.quantity) / 100).toFixed(2)}</span>
                                    <span className="text-xl text-brand-secondary font-semibold">${((promoPrice * item.quantity) / 100).toFixed(2)}</span>
                                  </>
                                ) : (
                                  <span className="text-xl text-text-primary font-semibold">{displayPrice !== null ? ((displayPrice * item.quantity) / 100).toFixed(2) : 'N/A'}</span>
                                )}
                              </div>
                          </div>
                          {/* Row 2, Col 3: Toggle */}
                          <div className="row-start-2 col-start-3 self-center justify-self-center w-full">
                            {(() => {
                                const oneoffPrice = product.prices.find(p => !p.recurring);
                                const subPrice = product.prices.find(p => !!p.recurring);
                                const hasBoth = !!oneoffPrice && !!subPrice;
                                if (!hasBoth) {
                                  return (
                                  <span className={`${price.recurring ? 'bg-brand-secondary text-white' : 'bg-neutral-muted-bg text-text-primary'} px-3 py-1 rounded-md text-sm w-full inline-flex justify-center text-center`}>
                                    {price.recurring ? 'Subscribe' : '1x Order'}
                                  </span>
                                  );
                                }
                                const isSub = !!price.recurring;
                                const targetPriceId = isSub ? (oneoffPrice as any).id : (subPrice as any).id;
                                return (
                                <button
                                  className={`relative inline-flex items-center justify-center w-full pl-6 pr-6 py-1 rounded-full text-sm transition-colors overflow-hidden ${isSub ? 'bg-brand-secondary text-white' : 'bg-neutral-muted-bg text-text-primary'}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      cartActions.updateItemPrice && cartActions.updateItemPrice(item.priceId, targetPriceId);
                                    }}
                                    aria-label="Toggle price type"
                                  >
                                    <span className="z-10">{isSub ? 'Subscribe' : '1x Order'}</span>
                                    <span className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white transition-all duration-300 ${isSub ? 'right-1' : 'left-1'}`}></span>
                                  </button>
                              );
                            })()}
                          </div>
                          {/* Row 3, single col: subscription note right-aligned */}
                          <div className="row-start-3 col-start-1 col-end-4 justify-self-end self-center">
                            <div className="text-lg text-text-secondary -mt-2">
                              {price.recurring ? (
                                <>refill ships every month, <span className="text-brand-secondary">cancel anytime</span></>
                              ) : (
                                <><span className="text-brand-secondary">toggle subscription ^ price</span></>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
                {/* Promo code reminder note */}
		{promo && promo.code && (
                  <div className="text-lg text-brand-secondary bg-brand-secondary/10 rounded px-3 py-2 mb-2 text-center font-medium relative z-0">
		    <div className="space-y-1">
		      <p>
			   Use coupon code <span className="font-bold">{promo.code}</span> at checkout.
		      </p>
		      {promo.duration && (
		        <p>
			  {promo.duration === 'once' 
			    ? 'Applies to first month.'
			    : promo.duration === 'forever'
			    ? 'Good forever.'
			    : promo.duration === 'repeating' && promo.duration_in_months
			    ? `Good for ${promo.duration_in_months} months of subscription.`
			    : null
			  }
		        </p>
		      )}
		      {promo.first_time_transaction && (
		        <p>
			  Good for first time orders.
		        </p>
		      )}
		    </div>
		  </div>
		)}
              </>
            )}
          </div>
        </div>

        {/* Fixed Bottom Checkout Section - Anchored to bottom with safe area support and proper padding */}
        {items.length > 0 && (
          <div 
            className="flex-shrink-0 border-t border-neutral-border/10 bg-surface p-6 pb-8 relative"
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 16px))'
            }}
          >
            {/* Shadow cast by footer onto scroll area */}
            <div className="absolute -top-3 left-0 right-0 h-3 bg-gradient-to-t from-black/15 via-black/8 to-transparent pointer-events-none z-10"></div>
            {/* Subtotal and Shipping */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg text-text-secondary">Subtotal</span>
                <div className="text-right">
                  {(() => {
                    const subtotal = items.reduce((sum, item) => {
                      const { price } = getProductAndPrice(item);
                      return sum + ((price?.unit_amount || 0) * item.quantity);
                    }, 0);
                    let promoSubtotal = null;
                    if (promo && (promo.percent_off || promo.amount_off)) {
                      if (promo.percent_off) {
                        promoSubtotal = subtotal * (1 - promo.percent_off / 100);
                      } else if (promo.amount_off) {
                        promoSubtotal = subtotal - promo.amount_off * items.length;
                      }
                    }
                    return promoSubtotal && promoSubtotal < subtotal ? (
                      <>
                        <span className="text-lg text-text-secondary line-through mr-2">${(subtotal / 100).toFixed(2)}</span>
                        <span className="text-lg font-medium text-green-600">${(promoSubtotal / 100).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-medium text-text-primary">{(subtotal / 100).toFixed(2)}</span>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg text-text-secondary">Shipping</span>
                <span className="text-lg font-medium text-text-primary">Free to US ;)</span>
              </div>
            </div>



            {/* Checkout Button */}
            <div className="flex justify-center mb-3">
              <button 
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-3 text-lg rounded-full transition-colors duration-200"
                onClick={() => {
                  // Determine presence of subscription and one-off items
                  let hasSubscription = false;
                  let hasOneOff = false;
                  for (const item of items) {
                    const { price } = getProductAndPrice(item);
                    if (!price) continue;
                    if (price.recurring) hasSubscription = true; else hasOneOff = true;
                  }

                  // If both types exist, show dual-checkout modal (subscription first)
                  if (hasSubscription && hasOneOff) {
                    setShowDualCheckoutModal(true);
                    return;
                  }

                  // Otherwise, single-pass checkout with explicit flags
                  const type = hasSubscription ? 'sub' : 'oneoff';
                  onClose();
                  window.location.href = `/checkout?mode=user&flow=single&type=${type}`;
                }}
              >
                cupgrade now
              </button>
            </div>

            {/* Microcopy */}
            <p className="text-lg text-center text-text-secondary opacity-60">
              handmade love in your life
            </p>
          </div>
        )}
      </div>

      {/* Dual-checkout modal - anchored just above the checkout button */}
      {showDualCheckoutModal && (
        <div className="pointer-events-none fixed inset-0" style={{ zIndex: 1000 }}>
          {/* No full-screen dark overlay; a light shadowed popover near the button */}
          <div className="absolute right-0 bottom-[132px] mr-6" style={{ width: 'min(26rem, 90vw)' }}>
            <div className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-neutral-border">
              <div className="px-4 py-3">
                <h3 className="text-2xl font-semibold text-text-primary mb-1">Two quick payments</h3>
                <p className="text-xl text-text-secondary">
                  Your subscription will check out first.<br/>
                  Then you’ll return for the one-time order.
                </p>
              </div>
              <div className="px-4 pb-4 pt-1 flex gap-2">
                <button
                  className="flex-1 bg-brand-secondary text-white rounded-full py-2 text-lg hover:opacity-90 transition"
                  onClick={() => {
                    setShowDualCheckoutModal(false);
                    onClose();
                    window.location.href = '/checkout?mode=user&flow=dual&type=sub';
                  }}
                >
                  Continue
                </button>
                <button
                  className="flex-1 bg-neutral-muted-bg text-text-primary rounded-full py-2 text-lg hover:opacity-90 transition"
                  onClick={() => setShowDualCheckoutModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default CartPanel; 
