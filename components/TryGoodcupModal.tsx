import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          style={{ background: 'transparent' }}
        >
          {/* Card stack */}
          <div className="relative flex flex-col items-center gap-4">
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
                className="w-[380px] md:w-[520px] bg-white/100 rounded-xl shadow-xl flex flex-row items-center gap-3 md:gap-4 p-3 border border-neutral-200 min-h-[96px] relative"
              >
                {/* Image left with mobile info button below */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <img src={product.images?.[0]} alt={product.name} className="w-24 h-24 md:w-24 md:h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => setExpandedDescription({
                      description: product.description || 'No description available.',
                      productName: product.name.split('(')[0].trim()
                    })}
                    className="md:hidden mt-1 w-7 h-7 bg-neutral-200 hover:bg-neutral-300 rounded-full flex items-center justify-center transition-colors"
                    aria-label="View product description"
                  >
                    <span className="text-base font-bold text-neutral-700 font-serif">i</span>
                  </button>
                </div>
                {/* Middle: name, copy, pricing */}
                <div className="flex-1 flex flex-col justify-center min-w-0 pr-10 md:pr-10">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xl md:text-lg font-semibold text-neutral-900 truncate">{product.name.split('(')[0].trim()}</div>
                      <div className="text-lg md:text-base text-neutral-600 whitespace-pre-line leading-snug">
                        {(product.metadata?.['short-copy'] || '')}
                      </div>
                    </div>
                    {/* Desktop info button to the right of copy */}
                    <button
                      onClick={() => setExpandedDescription({
                        description: product.description || 'No description available.',
                        productName: product.name.split('(')[0].trim()
                      })}
                      className="hidden md:flex mt-1 w-8 h-8 bg-neutral-200 hover:bg-neutral-300 rounded-full items-center justify-center transition-colors flex-shrink-0"
                      aria-label="View product description"
                    >
                      <span className="text-lg font-bold text-neutral-700 font-serif">i</span>
                    </button>
                  </div>
                  {/* Single row with both price/actions */}
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
                    return (
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mt-2">
                        {/* One-off price + button */}
                        {oneoffPrice && (
                          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start md:whitespace-nowrap">
                            <button
                              className="bg-gray-300 text-text-primary px-3 py-1 rounded-full text-base md:text-sm hover:opacity-90 transition-opacity shrink-0"
                              onClick={(e) => {
                                const oneoffPrice = product.prices.find(p => !p.recurring);
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
                            {oneoff.promo && oneoff.promo < oneoff.base ? (
                              <>
                                <span className="line-through text-lg md:text-base opacity-60 text-text-secondary">${(oneoff.base / 100).toFixed(2)}</span>
                                <span className="text-xl md:text-lg font-medium text-text-secondary">${(oneoff.promo / 100).toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-xl md:text-lg font-medium text-text-secondary">${(oneoff.base / 100).toFixed(2)}</span>
                            )}
                          </div>
                        )}
                        {/* Subscription price + button */}
                        {subscriptionPrice && (
                          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start md:whitespace-nowrap">
                            <button
                              className="bg-brand-secondary text-white px-3 py-1 rounded-full text-base md:text-sm hover:opacity-90 transition-opacity shrink-0"
                              onClick={(e) => {
                                const subPrice = product.prices.find(p => !!p.recurring);
                                if (!subPrice) return;
                                addItem({
                                  productId: product.id,
                                  priceId: subPrice.id,
                                  quantity: 1
                                }, { x: e.clientX, y: e.clientY });
                              }}
                            >
                              Subscription
                            </button>
                            {sub.promo && sub.promo < sub.base ? (
                              <>
                                <span className="line-through text-lg md:text-base opacity-60 text-text-secondary">${(sub.base / 100).toFixed(2)}</span>
                                <span className="text-xl md:text-lg font-bold text-brand-secondary">${(sub.promo / 100).toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-xl md:text-lg font-bold text-brand-secondary">${(sub.base / 100).toFixed(2)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Policy note */}
                  {(() => {
                    const subscriptionPrice = product.prices.find(p => !!p.recurring);
                    return subscriptionPrice ? (
                      <div className="text-center text-brand-secondary text-base md:text-sm mt-1">(cancel your subscription anytime)</div>
                    ) : null;
                  })()}
                </div>
                {/* No floating buttons; info button moved next to copy */}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TryGoodcupModal; 
