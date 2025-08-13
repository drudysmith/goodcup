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
  addItem: (item: CartItem, clickPosition?: { x: number; y: number }) => void;
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
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

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
          width: 'min(30rem, 92vw)', // Responsive width: 30rem on desktop, 92vw on mobile
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
              
              // Resolve prices by type
              const oneoffPrice = featuredProduct.prices.find(p => !p.recurring);
              const subscriptionPrice = featuredProduct.prices.find(p => !!p.recurring);

              // Helper to compute promo-adjusted display value
              const computeDisplay = (amount?: number | null) => {
                const base = amount || 0;
                if (promo && (promo.percent_off || promo.amount_off)) {
                  if (promo.percent_off) return { base, promo: base * (1 - promo.percent_off / 100) };
                  if (promo.amount_off) return { base, promo: base - promo.amount_off };
                }
                return { base, promo: null as number | null };
              };

              const oneoff = computeDisplay(oneoffPrice?.unit_amount);
              const sub = computeDisplay(subscriptionPrice?.unit_amount);
              
              const isExpanded = !!expandedMap[featuredProduct.id];
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
                  {/* Top row: badge + product name */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${badgeColor} text-white px-2 py-1 rounded text-sm font-medium`}>{badgeText}</span>
                    <h4 className="text-text-primary font-medium text-lg">{featuredProduct.name}</h4>
                  </div>

                  {/* Middle row: image + foldable text */}
                  <div className="flex items-start gap-3">
                    {featuredProduct.images[0] && (
                      <img
                        src={featuredProduct.images[0]}
                        alt={featuredProduct.name}
                        className="w-24 h-24 object-cover rounded-xl block"
                      />
                    )}
                    <div className="flex-1">
                      <div className={`${isExpanded ? '' : 'line-clamp-4'} text-lg text-text-tertiary`}> 
                        {featuredProduct.description || '30 servings of daily wellness'}
                      </div>
                      <div className="flex justify-center mt-1">
                        <button
                          className="text-text-tertiary hover:opacity-80 transition-opacity"
                          onClick={() => setExpandedMap({ ...expandedMap, [featuredProduct.id]: !isExpanded })}
                          aria-label={isExpanded ? 'Collapse description' : 'Expand description'}
                        >
                          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: two centered columns with stacked content (conditional on price type availability) */}
                  <div className={`mt-3 grid ${oneoffPrice && subscriptionPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-4 items-start`}>
                    {/* Left column: Single Order stack */}
                    {oneoffPrice && (
                      <div className="flex flex-col items-center">
                        <button
                          className="bg-gray-300 text-text-primary px-4 py-1 rounded-full text-base hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            if (!oneoffPrice) return;
                            addItem({
                              productId: featuredProduct.id,
                              priceId: oneoffPrice.id,
                              quantity: 1
                            }, { x: e.clientX, y: e.clientY });
                          }}
                        >
                          Single Order
                        </button>
                        <div className="mt-2 text-center leading-tight">
                          <div className="text-base text-text-secondary opacity-70 line-through">
                            {`$${(oneoff.base / 100).toFixed(2)}`} <span className="opacity-70">Promo</span>
                          </div>
                          <div className="text-lg font-medium text-text-secondary">
                            {`$${((oneoff.promo ?? oneoff.base) / 100).toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Right column: Subscription stack */}
                    {subscriptionPrice && (
                      <div className="flex flex-col items-center">
                        <button
                          className="bg-brand-secondary text-white px-4 py-1 rounded-full text-base hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            if (!subscriptionPrice) return;
                            addItem({
                              productId: featuredProduct.id,
                              priceId: subscriptionPrice.id,
                              quantity: 1
                            }, { x: e.clientX, y: e.clientY });
                          }}
                        >
                          Subscription
                        </button>
                        <div className="mt-2 text-center leading-tight">
                          <div className="text-base text-text-secondary opacity-70 line-through">
                            {`$${(sub.base / 100).toFixed(2)}`} <span className="opacity-70">Promo</span>
                          </div>
                          <div className="text-lg font-bold text-brand-secondary">
                            {`$${((sub.promo ?? sub.base) / 100).toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Policy note under stacks */}
                  {subscriptionPrice && (
                    <div className="mt-2 text-center text-brand-secondary">(cancel your subscription anytime)</div>
                  )}
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
                <div className="flex items-start gap-3">
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
                      <h4 className="text-text-primary text-lg font-medium">{product.name}</h4>
                      {/* Regular product card description with fold/expand */}
                      {(() => {
                        const isExpanded = !!expandedMap[product.id];
                        return (
                          <div className="mb-1">
                            <div className={`${isExpanded ? '' : 'line-clamp-3'} text-lg text-text-tertiary pr-6`}>
                              {product.description || '30 servings'}
                            </div>
                            <div className="flex justify-center mt-1">
                              <button
                                className="text-text-tertiary hover:opacity-80 transition-opacity"
                                onClick={() => setExpandedMap({ ...expandedMap, [product.id]: !isExpanded })}
                                aria-label={isExpanded ? 'Collapse description' : 'Expand description'}
                              >
                                <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Pricing stacks moved below to span full card width */}
                    </div>
                </div>

                {/* Full-width pricing stacks and policy note */}
                {(() => {
                  const oneoffPrice = product.prices.find(p => !p.recurring);
                  const subscriptionPrice = product.prices.find(p => !!p.recurring);
                  const computeDisplay = (amount?: number | null) => {
                    const base = amount || 0;
                    if (promo && (promo.percent_off || promo.amount_off)) {
                      if (promo.percent_off) return { base, promo: base * (1 - promo.percent_off / 100) };
                      if (promo.amount_off) return { base, promo: base - promo.amount_off };
                    }
                    return { base, promo: null as number | null };
                  };
                  const oneoff = computeDisplay(oneoffPrice?.unit_amount);
                  const sub = computeDisplay(subscriptionPrice?.unit_amount);
                  if (!oneoffPrice && !subscriptionPrice) return null;
                  return (
                    <>
                      <div className={`mt-2 grid ${oneoffPrice && subscriptionPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-4 items-start w-full`}>
                        {/* Left column: Single Order stack */}
                        {oneoffPrice && (
                        <div className="flex flex-col items-center">
                          <button
                            className="bg-gray-300 text-text-primary px-3 py-1 rounded-full text-base hover:opacity-90 transition-opacity"
                            onClick={(e) => {
                              if (!oneoffPrice) return;
                              addItem({
                                productId: product.id,
                                priceId: oneoffPrice.id,
                                quantity: 1
                              }, { x: e.clientX, y: e.clientY });
                            }}
                          >
                            Single Order
                          </button>
                          <div className="mt-2 text-center leading-tight">
                            <div className="text-base text-text-secondary opacity-70 line-through">
                              {`$${(oneoff.base / 100).toFixed(2)}`} <span className="opacity-70">Promo</span>
                            </div>
                            <div className="text-lg font-medium text-text-secondary">
                              {`$${((oneoff.promo ?? oneoff.base) / 100).toFixed(2)}`}
                            </div>
                          </div>
                        </div>
                        )}

                        {/* Right column: Subscription stack */}
                        {subscriptionPrice && (
                        <div className="flex flex-col items-center">
                          <button
                            className="bg-brand-secondary text-white px-3 py-1 rounded-full text-base hover:opacity-90 transition-opacity"
                            onClick={(e) => {
                              if (!subscriptionPrice) return;
                              addItem({
                                productId: product.id,
                                priceId: subscriptionPrice.id,
                                quantity: 1
                              }, { x: e.clientX, y: e.clientY });
                            }}
                          >
                            Subscription
                          </button>
                          <div className="mt-2 text-center leading-tight">
                            <div className="text-base text-text-secondary opacity-70 line-through">
                              {`$${(sub.base / 100).toFixed(2)}`} <span className="opacity-70">Promo</span>
                            </div>
                            <div className="text-lg font-bold text-brand-secondary">
                              {`$${((sub.promo ?? sub.base) / 100).toFixed(2)}`}
                            </div>
                          </div>
                        </div>
                        )}
                      </div>

                      {/* Policy note under stacks */}
                      {subscriptionPrice && (
                        <div className="mt-2 w-full text-center text-brand-secondary">(cancel your subscription anytime)</div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            ))}

          </motion.div>
        </div>



        {/* Fixed Bottom Info Section - Always visible and anchored with safe area support and proper padding */}
        <div 
          className="flex-shrink-0 border-t border-neutral-border/10 bg-surface p-4 pb-4 relative"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 8px))'
          }}
        >
          {/* Shadow cast by footer onto scroll area */}
          <div className="absolute -top-3 left-0 right-0 h-3 bg-gradient-to-t from-black/15 via-black/8 to-transparent pointer-events-none z-10"></div>
          {/* Two-up info blocks: Mandust and About Goodcup */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {/* Mandust block (left) */}
            <div className="text-center">
              <a 
                href="/mandust" 
                className="text-blue-600 hover:underline text-xl font-medium"
              >
                What is Mandust?
              </a>
              <p className="text-lg text-text-tertiary mt-0.5">
                Hands down, the best T supplement for men.
              </p>
              {/* Flame logo below (vector) */}
              <div className="mt-1 flex justify-center">
                <a href="/mandust" className="text-text-tertiary">
                <svg
                  className="w-5 h-5 text-text-tertiary"
                  viewBox="0 0 64 64"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M40.9 6.8c1.2 6.4-2.4 10.7-6.6 14.8-3.9 3.8-7.5 7.1-7.5 12 0 5.9 4.9 9.5 10.1 9.5 6.7 0 12.1-5.2 12.1-12.2 0-8.8-4.8-16-8.1-24.1zM30.8 2c1.5 8-3.1 13.5-8.1 18.4-4.8 4.7-9.2 8.8-9.2 15 0 7.4 6.2 12 12.8 12 8.6 0 15.6-6.7 15.6-15.4 0-11.2-6.2-20.3-11.1-30z"/>
                </svg>
                </a>
              </div>
            </div>

            {/* About Goodcup block (right) */}
            <div className="text-center">
              <a 
                href="/about" 
                className="text-brand-secondary hover:underline text-xl font-medium"
              >
                About Goodcup
              </a>
              <p className="text-lg text-text-tertiary mt-0.5">
                See us in our daddy-daughter shop.
              </p>
              {/* Cupgrades icon below (same as activator icon) */}
              <div className="mt-1 flex justify-center">
                <a href="/about" className="text-text-tertiary">
                <svg 
                  className="w-5 h-5 text-text-tertiary"
                  strokeWidth="2"
                  viewBox="0 0 98.69 82.49"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <g>
                    <path fill="currentColor" stroke="currentColor" strokeWidth="3" d="M49.3,0c12.9,0,25.79,0,38.69,0,1.45,0,1.57.06,2.04,1.43,2.85,8.43,5.7,16.87,8.49,25.32.23.68.23,1.53.07,2.24-.74,3.29-2.77,5.49-5.91,6.68-.31.12-.62.26-.95.33-.98.23-1.31.86-1.29,1.81.07,3.67.14,7.33.17,11,.03,3.36,0,6.72.02,10.09.05,7.36.12,14.73.19,22.09.01,1.36,0,1.38-1.36,1.38-21.38.04-42.76.08-64.14.11-5.81,0-11.61.01-17.42,0-1.36,0-1.53-.14-1.54-1.52-.01-1.77.07-3.54.08-5.31.04-10.91.06-21.82.09-32.74,0-1.71.03-3.42.11-5.13.05-1.21-.36-1.97-1.52-2.51-2.63-1.21-4.52-3.19-5.02-6.11-.2-1.17-.03-2.51.34-3.65C2.96,17.55,5.6,9.61,8.21,1.66,8.68.22,8.98,0,10.52,0c10.73,0,21.45,0,32.18,0,2.2,0,4.4,0,6.6,0ZM89.28,81.23c.03-.35.07-.59.07-.83,0-2.87,0-5.75,0-8.62,0-11.34,0-22.68.01-34.02,0-.73-.07-1.17-.99-1.21-4.02-.16-7.18-1.93-9.44-5.28-.09-.13-.26-.21-.44-.35-2.2,3.75-5.42,5.54-9.7,5.55-4.31,0-7.49-1.93-9.7-5.63-2.36,3.74-5.62,5.58-9.86,5.61-4.29.03-7.52-1.91-9.82-5.59-2.2,3.82-5.42,5.61-9.71,5.61-4.34,0-7.52-1.92-9.74-5.73-2.74,4.7-6.92,6.17-11.98,5.66v44.99h8.99c0-.47,0-.86,0-1.25,0-11.4,0-22.8,0-34.2,0-1.53,0-1.54,1.51-1.54,7,0,14,0,21,0,1.65,0,1.82.18,1.82,1.85,0,11.28,0,22.56-.01,33.84,0,.38,0,.76,0,1.15h48ZM18.18,81.45c.47,0,.81,0,1.14,0,6.26,0,12.52,0,18.78,0,1.7,0,1.96-.27,1.96-1.96,0-8.28-.01-16.56-.02-24.84,0-2.66-.01-5.32,0-7.97,0-.84-.25-1.21-1.22-1.2-6.47.05-12.95.02-19.43.03-1.21,0-1.21,0-1.21,1.18,0,11.21,0,22.42,0,33.64v1.13ZM57.79,1.19c.06.83.13,1.58.18,2.34.15,2.34.28,4.69.44,7.03.21,3.07.44,6.14.66,9.2.19,2.58.31,5.17.61,7.74.21,1.78.66,3.52,2,4.89,3.33,3.43,8.96,3.98,12.91,1.19,2.11-1.49,3.45-3.49,3.23-6.1-.3-3.47-.87-6.93-1.36-10.38-.55-3.79-1.15-7.57-1.73-11.35-.24-1.53-.49-3.05-.73-4.57h-16.2ZM24.82,1.16c-.57,3.52-1.13,6.99-1.7,10.46-.77,4.74-1.54,9.47-2.31,14.21-.37,2.26-.08,4.37,1.44,6.2,2.67,3.19,7.47,4.29,11.43,2.55,2.74-1.2,4.66-3.09,5.03-6.22.12-1,.2-2,.28-3,.3-3.73.59-7.47.89-11.2.22-2.79.45-5.59.66-8.38.11-1.51.19-3.03.28-4.61h-16.01Z"/>
                    <path  fill="currentColor" stroke="currentColor" strokeWidth="3" d="M64.61,44.38c4.89,0,9.77,0,14.66,0,1.27,0,1.44.17,1.44,1.41,0,7.18,0,14.36,0,21.54,0,1.18-.2,1.38-1.39,1.38-9.9,0-19.79,0-29.69,0-1.14,0-1.32-.18-1.32-1.33,0-7.15,0-14.3,0-21.45,0-1.49.06-1.55,1.55-1.55,4.92,0,9.84,0,14.75,0ZM79.28,45.54h-29.51v21.9c.32.02.58.06.85.06,9.26,0,18.51,0,27.77.02.8,0,.95-.28.94-1.01-.02-6.69-.01-13.38-.02-20.08,0-.27-.02-.54-.04-.89Z"/>
                    <path d="M38.38,61.96c0,1.15-.88,1.97-2.15,1.98-1.23.01-2.21-.84-2.22-1.94,0-1.07,1.01-2.01,2.18-2.02,1.22-.01,2.18.86,2.19,1.97ZM36.17,60.68c-.38.53-.65.91-1.06,1.47.48.22.86.52,1.23.51.26,0,.78-.54.73-.66-.17-.44-.53-.81-.9-1.32Z"/>
                    <path d="M70.39,49.95c-.23.39-.38.86-.71,1.15-3.41,3.04-6.85,6.05-10.28,9.07-.88.78-1.79,1.53-2.68,2.29-.52-.64-.51-1.05.06-1.55,3.99-3.45,7.94-6.94,11.92-10.39.41-.35.95-.55,1.44-.82.08.08.17.16.25.25Z"/>
                    <path d="M55.84,57.19c-.73-.48-.69-.91-.2-1.34,2.1-1.85,4.19-3.71,6.32-5.53.31-.27.79-.33,1.19-.49.06.07.12.13.19.2-.14.3-.21.69-.44.9-2.35,2.12-4.73,4.2-7.07,6.27Z"/>
                    <path d="M73.66,53.2c-.16.3-.25.66-.49.87-2.13,1.91-4.28,3.8-6.46,5.66-.26.22-.72.22-1.09.31.13-.4.15-.93.42-1.17,2.06-1.85,4.17-3.65,6.28-5.44.29-.25.71-.35,1.06-.53.09.09.18.19.27.28Z"/>
                  </g>
                </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CupgradesPanel; 
