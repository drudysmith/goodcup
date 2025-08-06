import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';
import { useRouter } from 'next/router';
import { useCartStore } from '../store/cartStore';

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  prices: Array<{
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring?: { interval: string };
  }>;
  metadata?: { [key: string]: string };
}

interface TryGoodcupModalProps {
  open: boolean;
  onClose: () => void;
  products: StripeProduct[];
  addItem: (item: { productId: string; priceId: string; quantity: number }, clickPosition?: { x: number; y: number }) => void;
}

const TryGoodcupModal: React.FC<TryGoodcupModalProps> = ({ open, onClose, products, addItem }) => {
  const { data: promo } = useBannerPromoQuery();
  const [expandedDescription, setExpandedDescription] = React.useState<{ description: string; productName: string } | null>(null);
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addItem);
  
  // Filter and sort featured products
  const featured = (products || [])
    .filter(p => {
      const val = parseInt(p.metadata?.['featured-item'] || '0');
      return val > 0 && val < 10;
    })
    .sort((a, b) => parseInt(a.metadata?.['featured-item'] || '0') - parseInt(b.metadata?.['featured-item'] || '0'))
    .slice(0, 3);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          animate={{ opacity: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          {/* Card stack */}
          <div 
            className="relative flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-8 right-0 text-3xl text-white bg-black/60 rounded-full w-10 h-10 flex items-center justify-center z-10 hover:bg-black/80 transition"
              aria-label="Close"
            >
              ×
            </button>
            
            {/* Description overlay */}
            {expandedDescription && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center z-20"
                onClick={() => setExpandedDescription(null)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#fdf8ea] rounded-lg p-6 max-w-sm mx-4 max-h-96 overflow-y-auto shadow-xl border border-neutral-200 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setExpandedDescription(null)}
                    className="absolute top-4 right-4 w-10 h-10 bg-neutral-200 hover:bg-neutral-300 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Close description"
                  >
                    <span className="text-2xl font-bold text-neutral-600">×</span>
                  </button>
                  <div className="text-lg text-neutral-700 leading-relaxed pr-10">
                    <div className="font-semibold text-neutral-900 mb-3 text-xl">
                      {expandedDescription.productName}
                    </div>
                    {expandedDescription.description}
                  </div>
                </motion.div>
              </motion.div>
            )}
            {/* Product cards */}
            {featured.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ delay: 0.1 * idx, duration: 0.4, type: 'spring', bounce: 0.2 }}
                                className="w-[380px] md:w-[480px] bg-white/100 rounded-xl shadow-xl flex flex-row items-center gap-3 md:gap-4 p-3 border border-neutral-200 min-h-[80px] relative"
              >
                {/* Image left */}
                <img src={product.images?.[0]} alt={product.name} className="w-20 md:w-24 h-20 md:h-24 object-cover rounded-lg flex-shrink-0" />
                {/* Middle: name, short-copy, price */}
                <div className="flex-1 flex flex-col justify-center min-w-0 pr-0 md:pr-0 -mr-5">
                  <div className="text-lg font-semibold text-neutral-900 truncate">{product.name.split('(')[0].trim()}</div>
                  <div className="text-base text-neutral-600 mb-1 whitespace-pre-line">
                    {product.metadata?.['short-copy'] || ''}
                  </div>
                  <div className="text-lg font-bold text-brand-secondary">
                    {(() => {
                      const price = product.prices?.[0];
                      const displayPrice = price?.unit_amount || 0;
                      let promoPrice = null;
                      
                      if (promo && (promo.percent_off || promo.amount_off)) {
                        if (promo.percent_off) {
                          promoPrice = displayPrice * (1 - promo.percent_off / 100);
                        } else if (promo.amount_off) {
                          promoPrice = displayPrice - promo.amount_off;
                        }
                      }
                      
                      const finalPrice = promoPrice && promoPrice < displayPrice ? promoPrice : displayPrice;
                      const scoopCount = parseInt(product.metadata?.['scoop-count'] || '1');
                      const pricePerServing = scoopCount > 0 ? finalPrice / scoopCount : finalPrice;
                      
                      if (promoPrice && promoPrice < displayPrice) {
                        return (
                          <>
                            <span className="line-through text-base text-text-secondary mr-1">${(displayPrice / 100).toFixed(2)}</span>
                            <span className="text-lg font-bold text-brand-secondary">
                              ${(promoPrice / 100).toFixed(2)}
                              {scoopCount > 1 && (
                                <span className="text-base font-normal text-neutral-500 ml-1">
                                  (${(pricePerServing / 100).toFixed(2)}/serving)
                                </span>
                              )}
                            </span>
                          </>
                        );
                      } else {
                        return price ? (
                          <span>
                            ${(displayPrice / 100).toFixed(2)}
                            {scoopCount > 1 && (
                              <span className="text-base font-normal text-neutral-500 ml-1">
                                (${(pricePerServing / 100).toFixed(2)}/serving)
                              </span>
                            )}
                          </span>
                        ) : '';
                      }
                    })()}
                  </div>
                </div>
                {/* Bottom right buttons container */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2" style={{ transform: 'translateX(-20px)' }}>
                  {/* Info button */}
                  <button
                    onClick={() => setExpandedDescription({
                      description: product.description || 'No description available.',
                      productName: product.name.split('(')[0].trim()
                    })}
                    className="w-8 h-8 bg-neutral-400 hover:bg-neutral-300 rounded-full flex items-center justify-center transition-colors"
                    aria-label="View product description"
                  >
                    <span className="text-lg font-bold text-neutral-100 font-serif">i</span>
                  </button>
                  
                  {/* Try It button with hover overlay */}
                  <div className="relative group">
                    <button 
                      onClick={(e) => {
                        if (product.prices?.[0]) {
                          // Add item to cart using direct cart store
                          addToCart({
                            productId: product.id,
                            priceId: product.prices[0].id,
                            quantity: 1
                          }, {
                            x: e.clientX,
                            y: e.clientY
                          });
                          
                          // Close modal and redirect to checkout
                          onClose();
                          router.push('/checkout');
                        }
                      }}
                      className="bg-brand-secondary text-white px-4 py-2 rounded-full font-medium text-base shadow hover:bg-brand-secondary/90 transition"
                    >
                      <span className="block md:hidden">Try It</span>
                      <span className="hidden md:block">Try It</span>
                    </button>
                    
                    {/* Hover overlay text */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div 
                        className="bg-brand-secondary text-white text-lg px-2 py-1 rounded whitespace-nowrap"
                        style={{ transform: 'rotate(-12deg)' }}
                      >
                        cancel anytime
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TryGoodcupModal; 
