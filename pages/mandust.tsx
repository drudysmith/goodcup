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
gsap.registerPlugin(ScrollTrigger);

const mandustIngredients = [
  { name: "American Ginseng", benefit: "Boosts stamina, resilience", onset: "1–2 weeks" },
  { name: "Asian Ginseng", benefit: "Sharpens focus, vitality", onset: "2–3 weeks" },
  { name: "Black Maca", benefit: "Mood, libido, hormone tone", onset: "7–10 days" },
  { name: "Boron Citrate", benefit: "Frees up testosterone", onset: "Steady use" },
  { name: "DIM", benefit: "Balances estrogen signals", onset: "2–4 weeks" },
  { name: "Ginkgo Biloba", benefit: "Improves memory, flow", onset: "3–4 weeks" },
  { name: "L-Arginine", benefit: "Enhances blood circulation", onset: "Hours" },
  { name: "L-Citrulline", benefit: "Increases oxygen & drive", onset: "Few days" },
  { name: "Lemon Extract", benefit: "Immunity + skin defense", onset: "1–2 weeks" },
  { name: "Magnesium Glycinate", benefit: "Deeper calm and recovery", onset: "Few days" },
  { name: "Malic Acid", benefit: "Faster energy production", onset: "Post-exercise" },
  { name: "Mucuna Pruriens", benefit: "Mood & motivation boost", onset: "1–2 weeks" },
  { name: "Shilajit", benefit: "Minerals for hormone health", onset: "Over weeks" },
  { name: "Tongkat Ali", benefit: "Raises strength, libido", onset: "2–3 weeks" },
  { name: "Tribulus Terrestris", benefit: "Supports sex & stamina", onset: "2–4 weeks" },
  { name: "Vitamin B12", benefit: "Clean energy and focus", onset: "Few days" },
  { name: "Vitamin B5", benefit: "Adrenal + metabolic help", onset: "1 week" },
  { name: "Vitamin B6", benefit: "Supports brain chemistry", onset: "1–2 weeks" },
  { name: "Vitamin B7", benefit: "Hair, skin, nail support", onset: "4–6 weeks" },
  { name: "Vitamin D3", benefit: "Vital for hormone flow", onset: "2–6 weeks" },
  { name: "Yin Yang Huo", benefit: "Traditional drive booster", onset: "2–3 weeks" },
  { name: "Yohimbe", benefit: "Fast, potent libido lift", onset: "Rapid" },
  { name: "Zinc", benefit: "T levels + immune power", onset: "Ongoing use" },
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
  const interval = price.recurring?.interval || '';
  const intervalText = interval === 'month' ? '/mo' : 
                      interval === 'year' ? '/yr' : 
                      interval === 'week' ? '/wk' : 
                      interval === 'day' ? '/day' : '';
  return `$${amount.toFixed(2)}${intervalText}`;
};

function FlipCard({ isFlipped, front, back }: { isFlipped: boolean; front: React.ReactNode; back: React.ReactNode }) {
  return (
    <div className="perspective-1000 w-full md:w-80 h-20 flex items-center justify-center">
      <motion.div
        className="relative w-full h-full"
        style={{ perspective: 1000 }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* Front Side */}
        <div
          className="absolute w-full h-full flex items-center justify-center shadow-md bg-surface rounded-xl border border-neutral-border backface-hidden"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {front}
        </div>
        {/* Back Side */}
        <div
          className="absolute w-full h-full flex items-center justify-center shadow-md bg-surface rounded-xl border border-neutral-border backface-hidden"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

function BenefitsFlipStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(() => mandustIngredients.map(() => false));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const triggers: ScrollTrigger[] = [];

    mandustIngredients.forEach((_, idx) => {
      const card = cardRefs.current[idx];
      if (!card) return;
      const trigger = ScrollTrigger.create({
        trigger: card,
        start: 'center center+=-40', // Card center near viewport center
        end: 'center center+=40',
        onEnter: () => setFlipped(f => f.map((v, i) => (i === idx ? true : v))),
        onLeaveBack: () => setFlipped(f => f.map((v, i) => (i === idx ? false : v))),
        onLeave: () => setFlipped(f => f.map((v, i) => (i === idx ? false : v))),
        onEnterBack: () => setFlipped(f => f.map((v, i) => (i === idx ? true : v))),
        // markers: true, // Uncomment for debugging
      });
      triggers.push(trigger);
    });
    return () => {
      triggers.forEach(t => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-8 w-full max-w-xl mx-auto py-8">
      {mandustIngredients.map((ing, idx) => (
        <div
          key={ing.name}
          ref={el => { cardRefs.current[idx] = el; }}
          className="w-full flex flex-col items-center select-none min-h-[80px]"
        >
          <FlipCard
            isFlipped={flipped[idx]}
            front={
              <div className="flex flex-row items-center justify-center w-full h-full">
                <span className="font-extrabold text-2xl text-text-primary whitespace-nowrap">{ing.name}</span>
                <span className="text-base text-text-tertiary font-semibold whitespace-nowrap ml-3">{(ing as any).dose || ''}</span>
              </div>
            }
            back={
              <div className="flex flex-col items-center justify-center w-full h-full px-4">
                <span className="font-bold text-xl text-text-primary text-center">{ing.benefit}</span>
              </div>
            }
          />
        </div>
      ))}
    </div>
  );
}

export default function Mandust() {
  const addItem = useCartStore((state) => state.addItem);
  const { visitorData, visitorId, jwt } = useVisitor();
  const orderRef = useRef<HTMLDivElement>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
    if (!selectedPriceId) {
      log('No price selected for checkout');
      return;
    }

    if (!visitorId) {
      log('No visitor ID available for checkout');
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

      log('Creating checkout session with payload:', checkoutPayload);

      const response = await fetch('/api/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        log('Redirecting to checkout URL:', url);
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      log('Checkout error:', error);
      setIsCheckingOut(false);
    }
  };

  const scrollToOrder = () => {
    orderRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="site-section-bg min-h-screen flex items-center justify-center">
          <div className="text-surface-background text-lg">Loading Mandust products...</div>
        </div>
      </Layout>
    );
  }

  if (error || !mandustProduct) {
    return (
      <Layout>
        <div className="site-section-bg min-h-screen flex items-center justify-center">
          <div className="text-surface-background text-lg">
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
        <section className="flex flex-col items-center justify-center text-center py-20 px-4 md:mx-24 mx-8 text-text-soft">
          <h1 className="text-5xl font-normal tracking-tight mb-6">MANDUST — The Best Testosterone Supplement Ever</h1>
          <p className="text-2xl font-normal mb-8">Real energy. Real edge. Built from years of trial, not theory.</p>
          <button
            className="px-10 py-4 text-2xl rounded bg-brand-secondary text-surface-background font-normal mb-6"
            onClick={scrollToOrder}
          >
            Try It
          </button>
          <p className="text-2xl max-w-xl mx-auto mt-4">If you're over 30, your T is already slipping. Time to reclaim the edge.</p>
        </section>

        {/* Intro Copy Section */}
        <section className="md:mx-24 mx-8 my-12 text-text-soft">
          <div className="w-full bg-transparent">
	    <h2 className="text-4xl font-normal mb-4">Why Mandust?</h2>
            <p className="text-xl mb-3 font-normal">
		Once you hit 30 as a man — sometimes earlier depending on stress and lifestyle — your testosterone starts dropping fast. Low T means lower energy, slower metabolism, foggy focus, and less drive. There are three pillars to healthy testosterone: 
            </p>
	    <p className="text-xl mb-3 font-normal">
		Exercise, Mental-emotional mastery (especially masculine work) and Nutrition. Supplementation is part of pillar three. And Mandust does it right. It's the most complete, ratio-corrected T-support stack on the market. No fluff, no trendy filler — just results.
	    </p>
          </div>
        </section>

        {/* Founder's Story Block */}
        <section className="md:mx-24 mx-8 my-12 text-text-soft">
          <div className="w-full bg-transparent">
            <h2 className="text-4xl font-normal mb-4">Founder's Story</h2>
            <p className="text-xl mb-3 font-normal">
              Mandust started when my own T levels crashed to 100 in my early 30s. That's dangerously low. I tried prescription TRT — short-term bandaid with long-term consequences.
            </p>
            <p className="text-xl mb-3 font-normal">
              So I spent 10 years testing supplements, researching ingredients, and refining ratios. I've tried it all — at one point I had a dozen different bottles on the shelf. Mandust is the final formula — real results from real effort.
            </p>
          </div>
        </section>

        {/* Flavor/Rite of Passage Block */}
        <section className="md:mx-24 mx-8 my-12 text-text-soft">
          <div className="w-full bg-transparent">
            <h2 className="text-4xl font-normal mb-4">Mandust doesn't taste like candy. It tastes like a man ground up.</h2>
            <p className="text-xl mb-3 font-normal">Real quotes from first-timers:</p>
            <p className="text-xl font-normal mb-6">
              "motor oil"<br />
              "barn"<br />
              "wet hay"<br />
              "shoulder pads"<br />
              "locker room"
            </p>
            <p className="text-xl font-normal mt-8">It's an acquired taste — and that's on purpose. This is not a drink mix. It's a rite of passage.</p>
          </div>
        </section>

        {/* Ingredient Grid Section (now Benefits List) */}
        <section className="max-w-5xl mx-auto py-12 md:mx-24 mx-8 text-text-soft">
          <h2 className="text-4xl font-normal mb-10 text-center tracking-tight">What does Mandust do?</h2>
          <BenefitsFlipStack />
        </section>

        {/* Try It Section (Order) */}
        <section ref={orderRef} className="w-full py-12 md:mx-24 mx-8 text-center text-text-soft">
          <h2 className="text-4xl font-normal mb-6 tracking-tight">Ready to Try Mandust?</h2>
          <p className="text-lg font-normal mb-8">If it works, you'll feel it in a week. If it doesn't, you'll know — but it will.</p>
          
          {/* Price Selection */}
          {availablePrices.length > 1 && (
            <div className="mb-8 flex justify-center">
              <select
                value={selectedPriceId}
                onChange={(e) => setSelectedPriceId(e.target.value)}
                className="px-6 py-3 text-lg bg-transparent border border-neutral-700 rounded text-text-soft"
                style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}
              >
                {availablePrices.map((price) => (
                  <option key={price.id} value={price.id} className="bg-neutral-800">
                    {formatInterval(price.recurring?.interval || '', price.recurring?.interval_count || 1)} - {formatPrice(price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="px-12 py-5 text-lg rounded bg-brand-secondary text-text-soft font-normal mb-6 disabled:opacity-50"
            onClick={handleCheckout}
            disabled={isCheckingOut || !selectedPrice}
            style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}
          >
            {isCheckingOut ? 'Processing...' : `Checkout — ${selectedPrice ? formatPrice(selectedPrice) : 'Select Price'}`}
          </button>
          <p className="text-lg max-w-xl mx-auto mt-4">30 servings per pouch. Scoop included. Ships next-day.</p>
        </section>
      </div>
    </Layout>
  );
} 
