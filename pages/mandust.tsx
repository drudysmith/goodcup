import Layout from '../components/Layout';
import Section from '../components/Section';
import { StyledText } from '../lib/textUtils';
import { useCartStore } from '../store/cartStore';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import { log } from '../lib/utils/log';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';
gsap.registerPlugin(ScrollTrigger);

const mandustIngredients = [
  { name: "American Ginseng", dosage: "500 mg", benefit: "American Ginseng. Native to North America, this root traditionally boosts stamina and immune resilience, and supports adrenal function.", onset: "Light boost in days; more stamina in weeks", get: "Stamina Boost" },
  { name: "Asian Ginseng", dosage: "500 mg", benefit: "Asian Ginseng. Derived from Panax ginseng root in Asia, this adaptogen enhances mental focus, vitality, and stress tolerance.", onset: "Mild clarity in first week; sustained energy in 2–3", get: "Mental Clarity" },
  { name: "Black Maca", dosage: "100 mg", benefit: "Black Maca. Grown in the Andes, this tuber supports libido, emotional well-being, and hormonal balance under physical stress.", onset: "Mood lift in days; deeper balance over weeks", get: "Mood & Drive" },
  { name: "Boron Citrate", dosage: "6 mg", benefit: "Boron Citrate promotes natural testosterone release, supports bone density, and aids cognitive clarity through hormone support.", onset: "Subtle early on; testosterone impact builds", get: "Free Testosterone" },
  { name: "DIM", dosage: "200 mg", benefit: "DIM promotes clean estrogen signaling (keeps estrogen levels at appropriate levels), hormonal equilibrium, and fat metabolism.", onset: "Internal calm starts early; balance in 2–4 weeks", get: "Hormone Cleanse" },
  { name: "Ginkgo Biloba", dosage: "500 mg", benefit: "Ginkgo Biloba. Of the oldest supplements, it has been used for thousands of years to improve circulation, memory, and mental clarity.", onset: "Flow felt early; focus sharpens by week 3", get: "Brain Flow" },
  { name: "L-Arginine", dosage: "2.5 g", benefit: "L-Arginine expands blood vessels, supports physical performance, and enhances nutrient delivery to muscles and tissues.", onset: "Pump within an hour; performance builds with daily use", get: "Circulation Power" },
  { name: "L-Citrulline", dosage: "2.25 g", benefit: "L-Citrulline improves blood flow and oxygen/nutrient absorbtion, lowers blood pressure, and boosts muscular endurance and recovery.", onset: "Within and hour; lasting output improves", get: "Endurance Flow" },
  { name: "Lemon Extract", dosage: "300 mg", benefit: "Lemon extract is a potent antioxidant complex that boosts collagen synthesis, immunity, and skin renewal and fights inflammation.", onset: "Fresh clarity fast; immune resilience over weeks", get: "Immunity Shield" },
  { name: "Magnesium Glycinate", dosage: "400 mg", benefit: "Magnesium Glycinate. Combined with the amino acid glycine, it boosts free testosterone levels and supports ATP and muscle health.", onset: "Calm within days; sleep & recovery deepen", get: "ATP and Free Testosterone" },
  { name: "Malic Acid", dosage: "250 mg", benefit: "Malic Acid boosts cellular energy output, reduces muscle fatigue, and supports mitochondrial activity post-exercise.", onset: "Quick energy after exertion; less soreness over time", get: "Energy Reboot" },
  { name: "Mucuna Pruriens", dosage: "500 mg", benefit: "Mucuna Pruriens naturally elevates dopamine levels, sharpens motivation, enhances mood resilience, and hormone regulation under stress.", onset: "Noticeable in hours; builds with use", get: "Motivation Lift" },
  { name: "Shilajit", dosage: "1 g", benefit: "Shilajit is harvested from Himalayan resin deposits and includes 80+ organic minerals that support energy and hormonal equilibrium.", onset: "Noticeable clarity day 1; deep resilience with time", get: "Vitality Upped" },
  { name: "Tongkat Ali", dosage: "600 mg", benefit: "Tongkat Ali. A flowering plant native to Southeast Asia, clinically studied to support testosterone, libido, and muscle mass.", onset: "Low-key edge same day; power and libido rise in 2–3", get: "T Drive" },
  { name: "Tribulus Terrestris", dosage: "1 g", benefit: "Tribulus Terrestris. Used in traditional Ayurvedic and Chinese medicine, this fruit-bearing herb supports libido and athletic drive.", onset: "Subtle drive within hours; stamina over 2–4 weeks", get: "Drive + Stamina" },
  { name: "Vitamin B12", dosage: "200 mcg", benefit: "Vitamin B12. Essential for nervous system function, oxygen transport, and mental energy regulation under demanding output.", onset: "Energy bump in days; steady mental lift with use", get: "Clean Energy" },
  { name: "Vitamin B5", dosage: "20 mg", benefit: "Vitamin B5 supports adrenal hormone synthesis, cellular metabolism, and efficient fuel conversion under stress.", onset: "Spark early on; broader energy in 1–2 weeks", get: "Fuel Conversion" },
  { name: "Vitamin B6", dosage: "10 mg", benefit: "Vitamin B6 optimizes neurotransmitter function, immune defense, and energy utilization through enzymatic support.", onset: "Mood lift in first week; focus increases after", get: "Neuro Balance" },
  { name: "Vitamin B7", dosage: "2 mg", benefit: "Vitamin B7. Also known as biotin, this B vitamin supports healthy hair, skin, nails, and nutrient metabolism.", onset: "Subtle shift early; hair & skin glow later", get: "Skin & Hair Glow" },
  { name: "Vitamin D3", dosage: "100 mcg (4,000 IU)", benefit: "Vitamin D3 regulates immune strength, testosterone activity and bone density while supporting brain and mood resilience.", onset: "Stability builds; strength, mood and T follow", get: "Mood & Strength" },
  { name: "Yin Yang Huo", dosage: "1.25 g", benefit: "Yin Yang Huo. A.k.a. Horny Goat Weed, this traditional Chinese has been used to support libido, blood flow, and energy in men.", onset: "Noticeable within an hour; fuller vigor in 2–3 weeks", get: "Libido Boost" },
  { name: "Yohimbe", dosage: "50 mg", benefit: "Yohimbe. Extracted from African Yohimbe tree bark, it’s a potent stimulant that increases blood flow and libido rapidly.", onset: "Strong within minutes; no long arc", get: "Stong Fire" },
  { name: "Zinc", dosage: "30 mg", benefit: "Zinc drives testosterone synthesis, supports recovery, regulates inflammation, and fortifies immune resilience in men.", onset: "Quiet at first; foundational support builds", get: "T Support" }
  ];

interface MandustPrice {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  type: string;
  active: boolean;
}

interface MandustProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  metadata: { [key: string]: string };
  prices: MandustPrice[];
}

const fetchMandustProducts = async (): Promise<{ products: MandustProduct[]; count: number }> => {
  const response = await fetch('/api/mandustProducts');
  if (!response.ok) {
    throw new Error('Failed to fetch Mandust products');
  }
  return response.json();
};

const formatInterval = (interval: string, intervalCount: number = 1): string => {
  const baseInterval = interval === 'month' ? 'Monthly' : 
                      interval === 'year' ? 'Yearly' : 
                      interval === 'week' ? 'Weekly' : 
                      interval === 'day' ? 'Daily' : interval;
  
  if (intervalCount > 1) {
    return `Every ${intervalCount} ${interval}s`;
  }
  return baseInterval;
};

const formatPrice = (price: MandustPrice): string => {
  if (!price.unit_amount) return 'Free';
  const amount = price.unit_amount / 100;
  return `$${amount.toFixed(2)}`;
};

// Responsive utility to detect desktop viewport
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    try {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    } catch {
      // Safari fallback
      mediaQuery.addListener(update);
      return () => mediaQuery.removeListener(update);
    }
  }, []);
  return isDesktop;
}

function FlipCard({ isFlipped, front, back }: { isFlipped: boolean; front: React.ReactNode; back: React.ReactNode }) {
  // Prepare separate scale controls for mobile vs desktop (card size unchanged)
  const isDesktop = useIsDesktop();
  const mobileScaleXWhenFlipped = 1.25;
  const desktopScaleXWhenFlipped = 1.85; // keep desktop card width the same
  const mobileTextScaleX = 1.2;
  const desktopTextScaleX = 1.1; // widen text on desktop
  const mobileTextScaleY = 0.65;
  const desktopTextScaleY = 0.50; // shorten text on desktop
  // Back-face text wrapping controls (set different max text width for mobile vs desktop)
  // FIND ME: FlipCard back text wrap width
  const mobileBackTextWidthPercent = 0.9; // 90% of card width on mobile -> more wrap
  const desktopBackTextWidthPercent = 1.0; // 75% of card width on desktop -> more wrap

  return (
    // CARD CONTAINER - Controls overall card size
    <div className="w-full md:w-100 h-12 md:h-16 flex items-center justify-center">
      {/* ANIMATION CONTAINER - Controls 3D flip and expansion */}
      <motion.div
        className={`relative w-full h-full ${isFlipped ? 'z-20' : 'z-10'}`}
        style={{ 
          perspective: '1000px', // 3D perspective depth
          transformStyle: 'preserve-3d' // Maintains 3D positioning
        }}
        animate={{ 
          rotateX: isFlipped ? 180 : 0, // Y-axis flip (horizontal rotation)
          scaleX: isFlipped ? (isDesktop ? desktopScaleXWhenFlipped : mobileScaleXWhenFlipped) : 1, // Responsive horizontal expansion
          scaleY: isFlipped ? 2.75 : 1  // Vertical expansion when flipped (more than horizontal)
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }} // Animation timing
      >
        {/* FRONT SIDE - Ingredient name and dosage */}
        <div
          className="absolute w-full h-full flex items-center justify-center shadow-md bg-surface rounded-xl border border-neutral-border"
          style={{ 
            backfaceVisibility: 'hidden', // Hide back side when front is visible
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateX(0deg)' // Front side orientation
          }}
        >
          {front}
        </div>
        {/* BACK SIDE - Benefit text with gray background */}
        <div
          className="absolute w-full h-full flex items-center justify-center shadow-md bg-gray-600 rounded-none border border-neutral-border"
          style={{
            backfaceVisibility: 'hidden', // Hide front side when back is visible
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)' // Back side orientation (flipped)
          }}
        >
          {/* TEXT CONTAINER - Counter-transform to prevent text scaling */}
          <div
            className="transform-none px-4 md:px-3 lg:px-2"
            style={{
              // FIND ME: FlipCard back text scale (separate mobile/desktop)
              transform: `scaleX(${isDesktop ? desktopTextScaleX : mobileTextScaleX}) scaleY(${isDesktop ? desktopTextScaleY : mobileTextScaleY})`,
              // Apply responsive max width to increase wrapping
              width: `${(isDesktop ? desktopBackTextWidthPercent : mobileBackTextWidthPercent) * 100}%`,
              margin: '0 auto'
            }}
          >
            {back}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BenefitsFlipStack({ setShowModal, cartItems, mandustProduct }: { setShowModal: (show: boolean) => void; cartItems: any[]; mandustProduct: MandustProduct | undefined }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // FLIP STATE - Tracks which cards are flipped (true = showing back, false = showing front)
  const [flipped, setFlipped] = useState(() => mandustIngredients.map(() => false));
  // CARD REFS - Array of refs for each card to enable ScrollTrigger targeting
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Wait for next tick to ensure refs are available
    const timer = setTimeout(() => {
      if (!containerRef.current) {
        return;
      }
      
      const triggers: ScrollTrigger[] = [];

      mandustIngredients.forEach((_, idx) => {
        const card = cardRefs.current[idx];
        if (!card) {
          return;
        }
        
                  // SCROLL TRIGGER CONFIGURATION - Controls when cards flip based on scroll position
          const trigger = ScrollTrigger.create({
            trigger: card, // Element that triggers the animation
            start: 'top 60%', // Trigger when card top reaches center + 10vh (higher in viewport)
            end: 'top 45%', // End when card top reaches center - 10vh
          onEnter: () => {
            setFlipped(prev => prev.map((v, i) => (i === idx ? true : v)));
          },
          onLeave: () => {
            setFlipped(prev => prev.map((v, i) => (i === idx ? false : v)));
          },
          onEnterBack: () => {
            setFlipped(prev => prev.map((v, i) => (i === idx ? true : v)));
          },
          onLeaveBack: () => {
            setFlipped(prev => prev.map((v, i) => (i === idx ? false : v)));
          },
          markers: false, // Hide debug markers
        });
        triggers.push(trigger);
      });

      return () => {
        triggers.forEach(t => t.kill());
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    // CARDS CONTAINER - Controls spacing and layout
    <div ref={containerRef} className="flex flex-col items-center gap-1 md:gap-4 w-full max-w-xl mx-auto py-8">
      {mandustIngredients.map((ing, idx) => {
        // BACK CONTENT - Benefit text with responsive styling
        const backContent = (
          <div className="flex flex-col items-center justify-center w-full h-full px-10 md:px-12">
            <div className="w-full max-w-full">
              <span className="font-bold text-xs md:text-sm text-white text-center leading-tight md:leading-normal md:whitespace-normal block">{ing.benefit}</span>
              <span className="font-normal text-xs md:text-sm text-gray-300 text-center leading-tight md:leading-normal md:whitespace-normal block mt-1">{ing.onset}</span>
            </div>
          </div>
        );
        
        return (
          // INDIVIDUAL CARD WRAPPER - Controls card positioning and ref assignment
          <div
            key={ing.name}
            ref={el => { 
              cardRefs.current[idx] = el; // Assign ref for ScrollTrigger targeting
            }}
            className="w-full flex flex-col items-center select-none min-h-[80px] relative"
          >
            <FlipCard
              isFlipped={flipped[idx]}
              front={
                // FRONT CONTENT - Ingredient name and dosage with responsive font sizes
                <div className="flex flex-row items-center justify-center w-full h-full">
                  <span className="font-extrabold text-lg md:text-2xl text-text-primary whitespace-nowrap">{ing.name}</span>
                  <span className="text-xs md:text-sm text-text-tertiary font-semibold whitespace-nowrap ml-2">{ing.dosage}</span>
                </div>
              }
              back={backContent}
            />
            {/* GET BUTTON - Appears on flipped cards only if Mandust not in cart */}
            {flipped[idx] && !cartItems.some(item => item.productId === mandustProduct?.id) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 4.3, duration: 0.7 }}
                className="absolute md:-bottom-12 md:-right-36 -bottom-6 -right-14 bg-blue-600/80 text-white text-base font-bold px-3 py-3 rounded-full shadow-lg hover:bg-blue-700/80 transition-colors z-30"
                onClick={() => {
                  // Open subscription modal
                  setShowModal(true);
                }}
              >
                {(() => {
                  const prefixes = ["Get some", "Get your", "It's time for", "Experience", "Here's your", "Time for"];
                  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                  return `${randomPrefix} ${ing.get}`;
                })()}
              </motion.button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PriceSelectionModal({ 
  isOpen, 
  onClose, 
  prices, 
  onAddToCart 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  prices: MandustPrice[]; 
  onAddToCart: (price: MandustPrice, event: React.MouseEvent) => void; 
}) {
  const { data: promo } = useBannerPromoQuery();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70" 
        onClick={onClose}
      />
      
      {/* Modal with animation */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
                 transition={{ duration: 0.6, ease: "easeIn" }}
        className="relative bg-black rounded-lg p-6 max-w-sm w-full mx-4"
        style={{
          border: '2px solid transparent',
          background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #ffffff 0%, #93c5fd 5%, #3b82f6 15%, #1d4ed8 30%, #1e40af 50%, #1e3a8a 100%) border-box'
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-normal text-gray-200">Select Subscription</h3>
          <button
            onClick={onClose}
            className="text-gray-200 hover:text-white text-6xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
                      {prices.map((price) => {
//               console.log('Price data:', price);
              
              // Determine which note to show based on interval
              let note = '';
              if (price.recurring?.interval === 'month' && price.recurring?.interval_count === 1) {
                note = 'Just starting (or don\'t have the results I want yet)';
              } else if (price.recurring?.interval === 'month' && price.recurring?.interval_count === 2) {
                note = 'Testosterone in good shape, looking to raise the score';
              } else if (price.recurring?.interval === 'week' && price.recurring?.interval_count === 6) {
                note = 'Have been working on supporting my testosterone';
              }
              
              return (
                <div 
                  key={price.id}
                  className="flex flex-col p-3 border border-blue-500/30 rounded-lg"
                >
                  <div className="mb-2">
                    <div className="text-xl font-normal text-gray-200">
                      {note}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-right pr-4">
                      <div className="text-lg font-normal text-gray-300">
                        {formatInterval(price.recurring?.interval || '', price.recurring?.interval_count || 1)}
                      </div>
                    </div>
                    <button
                      onClick={(event) => onAddToCart(price, event)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-normal hover:bg-blue-700 transition-colors ml-2"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
                        })}
          </div>
          
          {/* Price display at bottom */}
          <div className="text-center mt-6 pt-4 border-t border-blue-500/30">
            <div className="text-2xl font-normal text-gray-200">
              {prices.length > 0 && (() => {
                const price = prices[0];
                const displayPrice = price.unit_amount || 0;
                let promoPrice = null;
                
                if (promo && (promo.percent_off || promo.amount_off)) {
                  if (promo.percent_off) {
                    promoPrice = displayPrice * (1 - promo.percent_off / 100);
                  } else if (promo.amount_off) {
                    promoPrice = displayPrice - promo.amount_off;
                  }
                }
                
                if (promoPrice && promoPrice < displayPrice) {
                  return (
                    <>
                      <span className="line-through text-xl opacity-60 text-gray-400 mr-2">${(displayPrice / 100).toFixed(2)}</span>
                      <span className="text-2xl font-bold text-blue-400">${(promoPrice / 100).toFixed(2)}</span>
                    </>
                  );
                } else {
                  return `$${(displayPrice / 100).toFixed(2)}`;
                }
              })()}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

export default function Mandust() {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const { visitorData, visitorId, jwt } = useVisitor();
  const orderRef = useRef<HTMLDivElement>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['mandustProducts'],
    queryFn: fetchMandustProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mandustProduct = productsData?.products?.[0];
  const availablePrices = mandustProduct?.prices || [];

  useState(() => {
    if (availablePrices.length > 0 && !selectedPriceId) {
      setSelectedPriceId(availablePrices[0].id);
    }
  });

  const handleCheckout = async () => {
//     console.log('Checkout button clicked - testing if function is called');

    if (!selectedPriceId) {
      alert('Please select a price option');
      return;
    }

    if (!visitorId) {
      alert('Please refresh the page and try again');
      return;
    }

    setIsCheckingOut(true);

    try {
      const checkoutPayload = {
        items: [{ priceId: selectedPriceId, quantity: 1 }],
        customerEmail: visitorData?.email,
        visitorId: visitorId,
        visitorJwt: jwt,
        checkoutMode: 'guest'
      };

      const response = await fetch('/api/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create checkout session: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      
      if (responseData.url) {
        window.location.href = responseData.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error) {
      alert(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCheckingOut(false);
    }
  };

  const scrollToOrder = () => {
    orderRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddToCart = (price: MandustPrice, event: React.MouseEvent) => {
    if (!mandustProduct) {
      console.error('No product available');
      return;
    }

    // Capture click position for animation
    const clickPosition = {
      x: event.clientX,
      y: event.clientY
    };

    // Add item to cart with animation
    addItem({
      productId: mandustProduct.id,
      priceId: price.id,
      quantity: 1
    }, clickPosition);

    // Close modal after fly-to-cart animation completes (0.8 seconds)
    setTimeout(() => {
      setShowModal(false);
    }, 800);
  };

  if (isLoading) {
    return (
      <Layout>
        {/* Mandust-only footer override: make footer transparent */}
        <style>{`
          footer.w-full.bg-brand-dark {
            background: transparent !important;
            background-color: transparent !important;
          }
        `}</style>
        {/* Background video and overlay */}
        <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/media/backgrounds/mandustflame.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-text-soft text-lg font-normal" style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}>Loading Mandust products...</div>
        </div>
      </Layout>
    );
  }

  if (error || !mandustProduct) {
    return (
      <Layout>
        {/* Mandust-only footer override: make footer transparent */}
        <style>{`
          footer.w-full.bg-brand-dark {
            background: transparent !important;
            background-color: transparent !important;
          }
        `}</style>
        {/* Background video and overlay */}
        <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/media/backgrounds/mandustflame.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-text-soft text-lg font-normal" style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}>
            {error ? 'Error loading Mandust products' : 'No Mandust products found'}
          </div>
        </div>
      </Layout>
    );
  }

  const selectedPrice = availablePrices.find(p => p.id === selectedPriceId);

  return (
    <Layout>
      {/* Mandust-only footer override: make footer transparent */}
      <style>{`
        footer.w-full.bg-brand-dark {
          background: transparent !important;
          background-color: transparent !important;
        }
      `}</style>
      {/* Background video and overlay */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/media/backgrounds/mandustflame.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/60" />
              </div>
      {/* Main content (z-10) */}
      <div className="min-h-screen flex flex-col font-sans relative z-10" style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}>
        {/* Hero Section */}
        <section className="flex flex-col justify-center py-20 text-text-soft w-full max-w-6xl mx-auto px-6 lg:px-12 text-center md:text-left">
          <h1 className="text-5xl font-normal tracking-tight mb-6">MANDUST — The Best Testosterone Supplement Ever</h1>
          <p className="text-2xl font-normal mb-8">Real energy. Real edge. Built from years of trial, not theory.</p>
                <button
            className="px-10 py-4 text-2xl rounded-full bg-blue-600 text-white font-normal mb-6 hover:bg-blue-700 transition-colors"
            onClick={() => setShowModal(true)}
                >
            Try It
                </button>
          <p className="text-2xl max-w-xl mx-auto mt-4">If you're over 30, your T is already slipping. Time to reclaim the edge.</p>
        </section>

        {/* Intro Copy Section */}
        <section className="w-full max-w-6xl mx-auto px-6 lg:px-12 my-12 text-text-soft md:text-left">
          <div className="w-full bg-transparent">
	    <h2 className="text-4xl font-normal mb-4">Why Mandust?</h2>
            <p className="text-xl mb-3 font-normal">
		Once you hit 30 as a man — sometimes earlier depending on stress and lifestyle — your testosterone production begins to slow down. Low T means lower energy, slower metabolism, foggy focus, and less drive. There are three pillars to healthy testosterone: 
            </p>
	    <p className="text-xl mb-3 font-normal">
		Exercise, Mental-emotional mastery (especially masculine work) and Nutrition. Supplementation is part of pillar three. And Mandust does it right. It's the most complete, ratio-corrected T-support stack on the market. No fluff, no trendy filler — just results.
	    </p>
          </div>
        </section>

        {/* Founder's Story Block */}
        <section className="w-full max-w-6xl mx-auto px-6 lg:px-12 my-12 text-text-soft md:text-left">
          <div className="w-full bg-transparent">
            <h2 className="text-4xl font-normal mb-4">Founder's Story</h2>
            <p className="text-xl mb-3 font-normal">
              Mandust started when my own T levels crashed to 100 in my early 30s. That's dangerously low. I tried prescription TRT — short-term bandaid with long-term consequences.
            </p>
            <p className="text-xl mb-3 font-normal">
              I've spent 15 years testing supplements, researching ingredients, and refining ratios. 
              I've tried it all — at one point I had a dozen different bottles on the shelf. 
              Mandust is the final formula — real results from real effort.
              </p>
            </div>
        </section>

        {/* Flavor/Rite of Passage Block */}
        <section className="w-full max-w-6xl mx-auto px-6 lg:px-12 my-12 text-text-soft md:text-left">
          <div className="w-full bg-transparent">
            <h2 className="text-4xl font-normal mb-4">Mandust is not formulated for taste, but for effect.</h2>
            <p className="text-xl mb-3 font-normal">
              It won't taste like cotton candy. It's a down-to-earth taste.
              It smells different for each man, 
              but always reminiscent of something stereotypically masculine from their past experiences, no kidding.
              Real quotes from first-timers:</p>
            <p className="text-xl font-normal mb-6">
              "motor oil"<br />
              "barn"<br />
              "wet hay"<br />
              "shoulder pads"<br />
              "locker room"
            </p>
            <p className="text-xl font-normal mt-8">I've thought of putting it into a capsule, 
              to make it easier. But it's an accquired taste that you quickly learn to look forward to, 
              once you feel the difference and your mind associated the feeling with the taste.
              <br /> The back of the ingredient cards below describe the proven and time-tested benefits you feel from each ingredient.</p>
          </div>
        </section>

        {/* Ingredient Grid Section (now Benefits List) */}
        <section className="max-w-5xl mx-auto py-12 px-6 lg:px-12 text-text-soft">
          <h2 className="text-4xl font-normal mb-10 text-center tracking-tight">What does Mandust do?</h2>
          <BenefitsFlipStack setShowModal={setShowModal} cartItems={cartItems} mandustProduct={mandustProduct} />
        </section>

        {/* New Try It Block */}
        <section className="w-full max-w-6xl mx-auto px-6 lg:px-12 my-12 text-text-soft text-center mb-48">
          <div className="w-full bg-transparent">
            <h2 className="text-4xl font-normal mb-4">Ready to Try Mandust?</h2>
            <p className="text-xl mb-3 font-normal">
              You will notice an immediate difference, and this will build with use.
            </p>
            <p className="text-xl mb-3 font-normal">
              Results the same day and cumulatively.
            </p>
            <button
              className="px-12 py-5 text-lg rounded-full bg-blue-600 text-white font-normal mb-6 hover:bg-blue-700 transition-colors"
              onClick={() => setShowModal(true)}
              style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}
            >
              Try Mandust Now
            </button>
          </div>
        </section>
      </div>
      <PriceSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        prices={availablePrices}
        onAddToCart={handleAddToCart}
      />
    </Layout>
  );
} 
