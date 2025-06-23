import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Find the most popular product (Goodcup Daily 80)
  const mostPopularProduct = useMemo(() => {
    return products.find(p => p.name.toLowerCase().includes('daily') && p.name.toLowerCase().includes('80'));
  }, [products]);

  // Find the super healing product
  const superHealingProduct = useMemo(() => {
    return products.find(p => p.name.toLowerCase().includes('healing'));
  }, [products]);

  // Cupgrades product groupings
  const cupgradesGroups = useMemo(() => {
    if (!products.length) return [];
    
    // Get featured product IDs to exclude from lists
    const featuredProductIds = new Set([
      mostPopularProduct?.id,
      superHealingProduct?.id
    ].filter(Boolean));
    
    const groups = [
      {
        name: 'See All Cupgrades',
        products: products.filter(p => !featuredProductIds.has(p.id))
      }
      // Removed separate daily and super healing groups - now just one comprehensive list
    ];
    
    return groups.filter(group => group.products.length > 0);
  }, [products, mostPopularProduct?.id, superHealingProduct?.id]);

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
        <div className="bg-brand-dark text-surface-background px-6 py-3 text-center text-sm">
          Discover your perfect cupgrade experience
        </div>

        {/* Header with Close button */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-neutral-border/10">
          <h3 className="text-xl font-medium text-text-primary">Cupgrades</h3>
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
          className="flex-1 overflow-y-auto"
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
            {/* Most Popular Product at Top - Step 3: Full width, shorter, no spacing */}
            {mostPopularProduct && (
              <motion.div 
                className="cupgrade-item bg-brand-secondary/10 border-l-4 border-brand-secondary"
                style={{ padding: '16px 24px' }}
                variants={{
                  hidden: { 
                    opacity: 0, 
                    x: -50 
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-brand-secondary text-white px-2 py-1 rounded text-xs font-medium">
                    MOST POPULAR
                  </span>
                  <h4 className="text-text-primary font-medium text-sm">{mostPopularProduct.name}</h4>
                </div>
                <div className="flex items-center gap-3">
                  {mostPopularProduct.images[0] && (
                    <img
                      src={mostPopularProduct.images[0]}
                      alt={mostPopularProduct.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-text-tertiary mb-1">
                      {mostPopularProduct.description || '30 servings of daily wellness'}
                    </p>
                    <div className="flex items-center gap-2">
                      {mostPopularProduct.prices[0] && (
                        <>
                          <span className="text-xs text-text-tertiary line-through">
                            {((mostPopularProduct.prices[0].unit_amount || 0) * 1.15 / 100).toFixed(2)}
                          </span>
                          <span className="text-sm font-medium text-text-primary">
                            {((mostPopularProduct.prices[0].unit_amount || 0) / 100).toFixed(2)}
                          </span>
                        </>
                      )}
                      <button
                        className="ml-auto bg-brand-secondary text-white px-3 py-1 rounded text-xs hover:opacity-90 transition-opacity"
                        onClick={() => {
                          addItem({
                            productId: mostPopularProduct.id,
                            priceId: mostPopularProduct.prices[0].id,
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
            )}

            {/* Super Healing Product - Best System Reset - Step 3: Full width, shorter, no spacing */}
            {superHealingProduct && (
              <motion.div 
                className="cupgrade-item bg-brand-primary/10 border-l-4 border-brand-primary"
                style={{ padding: '16px 24px' }}
                variants={{
                  hidden: { 
                    opacity: 0, 
                    x: -50 
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-brand-primary text-white px-2 py-1 rounded text-xs font-medium">
                    BEST SYSTEM RESET
                  </span>
                  <h4 className="text-text-primary font-medium text-sm">{superHealingProduct.name}</h4>
                </div>
                <div className="flex items-center gap-3">
                  {superHealingProduct.images[0] && (
                    <img
                      src={superHealingProduct.images[0]}
                      alt={superHealingProduct.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-text-tertiary mb-1">
                      {superHealingProduct.description || 'Complete system reset formula'}
                    </p>
                    <div className="flex items-center gap-2">
                      {superHealingProduct.prices[0] && (
                        <>
                          <span className="text-xs text-text-tertiary line-through">
                            {((superHealingProduct.prices[0].unit_amount || 0) * 1.15 / 100).toFixed(2)}
                          </span>
                          <span className="text-sm font-medium text-text-primary">
                            {((superHealingProduct.prices[0].unit_amount || 0) / 100).toFixed(2)}
                          </span>
                        </>
                      )}
                      <button
                        className="ml-auto bg-brand-primary text-white px-3 py-1 rounded text-xs hover:opacity-90 transition-opacity"
                        onClick={() => {
                          addItem({
                            productId: superHealingProduct.id,
                            priceId: superHealingProduct.prices[0].id,
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
            )}

            {/* Cupgrades Groups - Step 4: Taller dropdown */}
            {cupgradesGroups.map((group, groupIndex) => (
              <div key={group.name} className="mb-2">
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedGroups);
                    if (newExpanded.has(group.name)) {
                      newExpanded.delete(group.name);
                    } else {
                      newExpanded.add(group.name);
                    }
                    setExpandedGroups(newExpanded);
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 bg-surface-elevated hover:bg-neutral-muted-bg/30 transition-colors border-t border-neutral-border/10"
                  style={{ minHeight: '64px' }} // Step 4: Make dropdown taller
                >
                  <span className="font-medium text-text-primary">{group.name}</span>
                  <svg 
                    className={`w-5 h-5 transition-transform text-text-secondary ${
                      expandedGroups.has(group.name) ? 'rotate-180' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedGroups.has(group.name) && (
                  <motion.div 
                    className="border-b border-neutral-border/10 relative"
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
                    {/* Shadow when expanded content might go under anchored bottom */}
                    <div className="scroll-shadow scroll-shadow-cupgrades"></div>
                    
                    {group.products.map((product, productIndex) => (
                      <motion.div 
                        key={product.id}
                        className="cupgrade-item px-6 py-4 border-b border-neutral-border/5"
                        variants={{
                          hidden: { 
                            opacity: 0, 
                            x: -50 
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
                        <div className="flex items-center gap-3">
                          {product.images[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="text-text-primary text-sm font-medium">{product.name}</h4>
                            <p className="text-xs text-text-tertiary mb-2">
                              {product.description || '30 servings'}
                            </p>
                            <div className="flex items-center gap-2">
                              {product.prices[0] && (
                                <>
                                  <span className="text-xs text-text-tertiary line-through">
                                    {((product.prices[0].unit_amount || 0) * 1.15 / 100).toFixed(2)}
                                  </span>
                                  <span className="text-sm font-medium text-text-primary">
                                    {((product.prices[0].unit_amount || 0) / 100).toFixed(2)}
                                  </span>
                                </>
                              )}
                              <button
                                className="ml-auto bg-brand-secondary text-white px-3 py-1 rounded text-xs hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  addItem({
                                    productId: product.id,
                                    priceId: product.prices[0].id,
                                    quantity: 1
                                  });
                                }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Fixed Bottom Info Section - Always visible and anchored with safe area support and proper padding */}
        <div 
          className="flex-shrink-0 border-t border-neutral-border/10 bg-surface p-6 pb-8"
          style={{
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 16px))'
          }}
        >
          <div className="text-center">
            <h4 className="font-medium text-text-primary mb-2">Choose Your Perfect Cupgrade</h4>
            <p className="text-xs text-text-secondary opacity-60 mb-4">
              handpicked wellness formulas for your unique journey
            </p>
          </div>
          {/* Man Dust link */}
          <div className="text-center">
            <a 
              href="/mandust" 
              className="text-brand-secondary hover:underline text-sm font-medium"
            >
              What is Man Dust?
            </a>
            <p className="text-xs text-text-tertiary mt-1">
              Hands down the best T supplement for men.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CupgradesPanel; 