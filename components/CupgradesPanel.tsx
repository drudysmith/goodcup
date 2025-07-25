import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';

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
  metadata?: { [key: string]: string };
  staticLabel?: string; // Added for pre-selected feature labels
}

interface CartItem {
  productId: string;
  priceId: string;
  quantity: number;
}

interface CupgradesPanelProps {
  products: StripeProduct[];
  cupgradesClosing: boolean;
  onClose: () => void;
  addItem: (item: CartItem) => void;
}

const CupgradesPanel: React.FC<CupgradesPanelProps> = ({ 
  products, 
  cupgradesClosing, 
  onClose, 
  addItem 
}) => {
  // Auto-scroll state management
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollCancelled, setAutoScrollCancelled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const autoScrollRef = useRef<number | null>(null);
  const lastScrollTop = useRef<number>(0);
  // Get featured products (metadata value < 10) with static random labels
  const featuredProducts = useMemo(() => {
    if (!products.length) return [];
    
    const getRandomFeatureLabel = (product: StripeProduct) => {
      const featureLabels = product.metadata?.['feature-label'] || '';
      if (!featureLabels) return 'FEATURED';
      
      const labels = featureLabels.split(',').map(label => label.trim()).filter(label => label);
      if (labels.length === 0) return 'FEATURED';
      
      const randomIndex = Math.floor(Math.random() * labels.length);
      return labels[randomIndex].toUpperCase();
    };
    
    return products
      .filter(p => {
        const featuredValue = parseInt(p.metadata?.['featured-item'] || '0');
        return featuredValue > 0 && featuredValue < 10;
      })
      .sort((a, b) => {
        const aValue = parseInt(a.metadata?.['featured-item'] || '0');
        const bValue = parseInt(b.metadata?.['featured-item'] || '0');
        return aValue - bValue; // Sort ascending (1, 2, 3...)
      })
      .map(product => ({
        ...product,
        staticLabel: getRandomFeatureLabel(product) // Select label once and store it
      }));
  }, [products]);

  // Get regular products (metadata value >= 10) ordered by metadata value
  const regularProducts = useMemo(() => {
    if (!products.length) return [];
    
    return products
      .filter(p => {
        const featuredValue = parseInt(p.metadata?.['featured-item'] || '0');
        return featuredValue >= 10;
      })
      .sort((a, b) => {
        const aValue = parseInt(a.metadata?.['featured-item'] || '0');
        const bValue = parseInt(b.metadata?.['featured-item'] || '0');
        return aValue - bValue; // Sort ascending (10, 11, 12...)
      });
  }, [products]);

  const { data: promo } = useBannerPromoQuery();

  // Auto-scroll logic
  useEffect(() => {
    if (cupgradesClosing || autoScrollCancelled) return;

    // Start auto-scroll after 1 second delay
    const startDelay = setTimeout(() => {
      if (autoScrollCancelled) return;
      
      setAutoScrollActive(true);
      let startTime = Date.now();
      
      const autoScroll = () => {
        if (autoScrollCancelled || !scrollContainerRef.current) return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const scrollAmount = elapsed * 0.03; // 0.05 pixels per millisecond
        
        const container = scrollContainerRef.current;
        const maxScroll = container.scrollHeight - container.clientHeight;
        
        if (scrollAmount >= maxScroll) {
          // Reached the bottom, stop auto-scroll
          setAutoScrollActive(false);
          // Keep scroll indicator visible until user manually scrolls
          return;
        }
        
        container.scrollTop = scrollAmount;
        autoScrollRef.current = requestAnimationFrame(autoScroll);
      };
      
      autoScrollRef.current = requestAnimationFrame(autoScroll);
    }, 2000);

    return () => {
      clearTimeout(startDelay);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [cupgradesClosing, autoScrollCancelled]);

  // Manual scroll detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (autoScrollCancelled) return;
      
      const currentScrollTop = container.scrollTop;
      
      // Check if user manually scrolled (significant change not caused by auto-scroll)
      if (Math.abs(currentScrollTop - lastScrollTop.current) > 2) {
        setAutoScrollCancelled(true);
        setAutoScrollActive(false);
        setShowScrollIndicator(false);
        
        if (autoScrollRef.current) {
          cancelAnimationFrame(autoScrollRef.current);
        }
      }
      
      lastScrollTop.current = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [autoScrollCancelled]);

  return (
    <>
      {/* Backdrop - separate container */}
      <div 
        className={`fixed inset-0 bg-neutral-foreground transition-opacity duration-300 z-40 ${
          cupgradesClosing ? 'backdrop-fade-out bg-opacity-70' : 'backdrop-fade-in bg-opacity-70'
        }`}
        onClick={onClose}
      />
      
      {/* Cupgrades Panel - independent fixed element at viewport edge */}
      <div 
        className={`fixed top-0 left-0 z-50 bg-surface shadow-2xl flex flex-col ${
          cupgradesClosing ? 'animate-slide-out-left' : 'animate-slide-in-left'
        }`}
        style={{
          width: 'min(30rem, 90vw)', // Responsive width: 30rem on desktop, 90vw on mobile
          height: '100dvh', // Dynamic viewport height for mobile browser UI
          fallbacks: {
            height: '100vh' // Fallback for browsers without dvh support
          }
        } as React.CSSProperties}
      >
        {/* Header Banner */}
        {/* Font change here - header banner text */}
        <div className="bg-brand-dark text-surface-background px-6 py-3 text-center text-xl">
          Discover your perfect cupgrade experience
        </div>

        {/* Header with Close button */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-neutral-border/10 relative">
          {/* Font change here - main header title */}
          <h3 className="text-2xl font-medium text-text-primary">Cupgrades Market</h3>
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
          
          {/* Scroll Indicator - positioned from header */}
          {showScrollIndicator && (
            <div className="absolute top-full right-4 mt-4 z-30 pointer-events-none">
              <div className="w-8 h-8 bg-neutral-muted-bg rounded-full flex items-center justify-center">
                <svg 
                  className="w-4 h-4 text-text-tertiary animate-bounce" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ animationDuration: '2s' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Area with hidden scrollbar */}
        <div 
          ref={scrollContainerRef}
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
          
          <motion.div 
            className="pb-4"
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
            {/* Featured Products - dynamically rendered based on metadata */}
            {featuredProducts.map((featuredProduct, index) => {
              // Alternate between green (brand-secondary) and orange (brand-primary) colors
              const isEven = index % 2 === 0;
              const badgeColor = isEven ? 'bg-brand-secondary' : 'bg-brand-primary';
              
              // Use the pre-selected static label
              const badgeText = featuredProduct.staticLabel;
              
              const price = featuredProduct.prices[0];
              const displayPrice = price?.unit_amount || 0;
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
                  key={featuredProduct.id}
                  className={`cupgrade-item ${badgeColor}/10 border-l-4 ${badgeColor.replace('bg-', 'border-')}`}
                  style={{ padding: '16px 24px' }}
                  variants={{
                    hidden: { opacity: 0, x: -50 },
                    visible: { opacity: 1, x: 0, transition: { type: "tween", ease: "easeOut", duration: 0.4 } }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {/* Font change here - featured product badge */}
                    <span className={`${badgeColor} text-white px-2 py-1 rounded text-sm font-medium`}>
                      {badgeText}
                    </span>
                    {/* Font change here - featured product name */}
                    <h4 className="text-text-primary font-medium text-base">{featuredProduct.name}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Image size change here - featured product image */}
                    {featuredProduct.images[0] && (
                      <img
                        src={featuredProduct.images[0]}
                        alt={featuredProduct.name}
                        className="w-24 h-24 object-cover rounded-xl block"
                      />
                    )}
                    <div className="flex-1">
                      {/* Font change here - featured product description */}
                      <p className="text-sm text-text-tertiary mb-1">
                        {featuredProduct.description || '30 servings of daily wellness'}
                      </p>
                      <div className="flex items-center gap-2">
                        {/* Price change here - using only actual stripe price, removed multiplier */}
                        {price && (
                          promoPrice && promoPrice < displayPrice ? (
                            <>
                              <span className="line-through text-base opacity-60 text-text-secondary mr-1">${(displayPrice / 100).toFixed(2)}</span>
                              <span className="text-lg font-bold text-brand-secondary">${(promoPrice / 100).toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="text-base font-medium text-text-primary">${(displayPrice / 100).toFixed(2)}</span>
                          )
                        )}
                        {/* Font change here - featured product button */}
                        <button
                          className={`ml-auto ${badgeColor} text-white px-3 py-1 rounded text-sm hover:opacity-90 transition-opacity`}
                          onClick={() => {
                            addItem({
                              productId: featuredProduct.id,
                              priceId: featuredProduct.prices[0].id,
                              quantity: 1
                            });
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}



            {/* Regular Products - displayed directly without dropdown */}
            {regularProducts.map((product, productIndex) => (
              <motion.div 
                key={product.id}
                className="cupgrade-item px-6 py-4 border-b border-neutral-border/5"
                variants={{
                  hidden: { opacity: 0, x: -50 },
                  visible: { opacity: 1, x: 0, transition: { type: "tween", ease: "easeOut", duration: 0.4 } }
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Image size change here - regular product card image */}
                  {product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    {/* Font change here - regular product card name */}
                    <h4 className="text-text-primary text-base font-medium">{product.name}</h4>
                    {/* Font change here - regular product card description */}
                    <p className="text-sm text-text-tertiary mb-2">
                      {product.description || '30 servings'}
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Price change here - using only actual stripe price, removed multiplier */}
                      {product.prices[0] && (() => {
                        const price = product.prices[0];
                        const displayPrice = price.unit_amount || 0;
                        let promoPrice = null;
                        if (promo && (promo.percent_off || promo.amount_off)) {
                          if (promo.percent_off) {
                            promoPrice = displayPrice * (1 - promo.percent_off / 100);
                          } else if (promo.amount_off) {
                            promoPrice = displayPrice - promo.amount_off;
                          }
                        }
                        return promoPrice && promoPrice < displayPrice ? (
                          <>
                            <span className="line-through text-base opacity-60 text-text-secondary mr-1">${(displayPrice / 100).toFixed(2)}</span>
                            <span className="text-lg font-bold text-brand-secondary">${(promoPrice / 100).toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-base font-medium text-text-primary">${(displayPrice / 100).toFixed(2)}</span>
                        );
                      })()}
                      {/* Font change here - regular product card button */}
                      <button
                        className="ml-auto bg-brand-secondary text-white px-3 py-1 rounded text-base hover:opacity-90 transition-opacity"
                        onClick={() => {
                          addItem({
                            productId: product.id,
                            priceId: product.prices[0].id,
                            quantity: 1
                          });
                        }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

          </motion.div>
        </div>



        {/* Fixed Bottom Info Section - Always visible and anchored with safe area support and proper padding */}
        <div 
          className="flex-shrink-0 border-t border-neutral-border/10 bg-surface p-6 pb-8 relative"
          style={{
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 16px))'
          }}
        >
          {/* Shadow cast by footer onto scroll area */}
          <div className="absolute -top-3 left-0 right-0 h-3 bg-gradient-to-t from-black/15 via-black/8 to-transparent pointer-events-none z-10"></div>
          {/* Man Dust link */}
          <div className="text-center">
            {/* Font change here - man dust link */}
            <a 
              href="/mandust" 
              className="text-brand-secondary hover:underline text-xl font-medium"
            >
              What is Man Dust?
            </a>
            {/* Font change here - man dust description */}
            <p className="text-lg text-text-tertiary mt-1">
              Hands down the best T supplement for men.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CupgradesPanel; 
