import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
          className="fixed inset-0 z-20 flex items-center justify-center pointer-events-auto"
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
            {/* Product cards */}
            {featured.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ delay: 0.1 * idx, duration: 0.4, type: 'spring', bounce: 0.2 }}
                className="w-[340px] md:w-[400px] bg-white/90 rounded-xl shadow-xl flex flex-row items-center gap-3 md:gap-4 p-3 border border-neutral-200 min-h-[80px]"
              >
                {/* Image left */}
                <img src={product.images?.[0]} alt={product.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                {/* Middle: name, short-copy, price */}
                <div className="flex-1 flex flex-col justify-center min-w-0 pr-1 md:pr-0">
                  <div className="text-base font-semibold text-neutral-900 truncate">{product.name.split('(')[0].trim()}</div>
                  <div className="text-xs text-neutral-600 mb-1 whitespace-pre-line">
                    {product.metadata?.['short-copy'] || ''}
                  </div>
                  <div className="text-sm font-bold text-brand-secondary">
                    {product.prices?.[0]?.unit_amount ? `$${(product.prices[0].unit_amount / 100).toFixed(2)}` : ''}
                  </div>
                </div>
                {/* Button right */}
                <button 
                  onClick={(e) => {
                    if (product.prices?.[0]) {
                      addItem({
                        productId: product.id,
                        priceId: product.prices[0].id,
                        quantity: 1
                      }, {
                        x: e.clientX,
                        y: e.clientY
                      });
                    }
                  }}
                  className="bg-brand-secondary text-white px-4 py-2 rounded-full font-medium text-sm shadow hover:bg-brand-secondary/90 transition flex-shrink-0 -mr-2 md:mr-0"
                >
                  <span className="block md:hidden">Try It</span>
                  <span className="hidden md:block">Add to Cart</span>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TryGoodcupModal; 