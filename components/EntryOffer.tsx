import React, { useEffect, useRef, useState } from 'react';
import TryGoodcupModal from './TryGoodcupModal';

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

interface EntryOfferProps {
  open: boolean;
  onClose: () => void;
  products?: StripeProduct[];
}

const EntryOffer: React.FC<EntryOfferProps> = ({ open, onClose, products = [] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showTryModal, setShowTryModal] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      // Don't close if TryGoodcupModal is open
      if (showTryModal) return;
      
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, showTryModal]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 fade-in-global" style={{ pointerEvents: 'auto' }}>
        <div
          ref={ref}
          className="w-full max-w-md sm:max-w-lg bg-[#f9dfc7] rounded-xl shadow-2xl border border-neutral-border relative flex flex-col items-center px-0 pb-8 pt-0"
          style={{ animation: 'fadeIn 0.7s' }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-800 text-3xl font-bold focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
          <div className="w-full flex flex-col items-center -mt-16 sm:-mt-16 mb-2">
            <img
              src="/media/product_imgs/basic_product_img.webp"
              alt="Goodcup product"
              className={`w-48 sm:w-56 h-auto object-contain rounded-lg shadow-lg mx-auto transition-all duration-700 ease-out
                ${imgLoaded ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}
                hover:scale-115 active:scale-105`}
              style={{ background: '#f9dfc7' }}
              onLoad={() => setImgLoaded(true)}
              draggable={false}
            />
          </div>
          <div className="flex flex-col items-center px-6 sm:px-10 mt-2 w-full">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-3 text-primary leading-tight text-center" style={{ fontFamily: 'var(--font-sans)' }}>
              Do you like feeling clear-minded?
            </h1>
            <p className="text-base sm:text-lg text-neutral-800 mb-5 text-center leading-normal" style={{ fontFamily: 'var(--font-sans)' }}>
              Our ingredients are formulated for natural clarity — no system shock, no crash on the way down.<br/>
              It’s gentle but firm, and we’re so confident you’ll love how it feels that we’ll refund you if you don’t.<br/>
              Stop using that other stuff and make the switch.<br/>
              <span className="block mt-2">Scroll or open the Cupgrades Market (top left) to learn more. ;)</span>
            </p>
            <button
              className="w-full max-w-xs py-3 text-lg font-semibold mt-2 mb-6 bg-brand-secondary text-white rounded-full transition-colors duration-200 hover:bg-brand-secondary/90 focus:outline-none"
              onClick={() => setShowTryModal(true)}
            >
              Try Goodcup
            </button>
          </div>
        </div>
        <style jsx global>{`
          .fade-in-global {
            animation: fadeIn 0.7s;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
      <TryGoodcupModal
        open={showTryModal}
        onClose={() => setShowTryModal(false)}
        products={products}
        addItem={null as any} // Select button is null for now
      />
    </>
  );
};

export default EntryOffer;
