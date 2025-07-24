import Layout from '../components/Layout';
import Section from '../components/Section';
import { StyledText } from '../lib/textUtils';
import { useCartStore } from '../store/cartStore';
import { useVisitor } from '../lib/contexts/VisitorContext';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { log } from '../lib/utils/log';

const INGREDIENTS = [
  { name: 'AMERICAN GINSENG', dose: '500 mg', benefit: 'Boosts energy, immune resilience', onset: '1–2 weeks' },
  { name: 'ASIAN GINSENG', dose: '500 mg', benefit: 'Vitality, focus (adaptogen)', onset: '2–3 weeks' },
  { name: 'BLACK MACA', dose: '100 mg', benefit: 'Libido, hormone, mood', onset: '7–10 days' },
  { name: 'BORON CITRATE', dose: '6 mg', benefit: 'Free T, bone strength', onset: 'steady use' },
  { name: 'DIM', dose: '200 mg', benefit: 'Estrogen metabolism', onset: '2–4 weeks' },
  { name: 'GINKGO BILOBA', dose: '500 mg', benefit: 'Memory, blood flow', onset: 'within a month' },
  { name: 'L-ARGININE', dose: '2.5 g', benefit: 'Nitric oxide, blood flow', onset: 'hours' },
  { name: 'L-CITRULLINE', dose: '2.25 g', benefit: 'Endurance, oxygen', onset: 'days' },
  { name: 'LEMON EXTRACT', dose: '300 mg', benefit: 'Immunity, skin (antioxidant)', onset: '1–2 weeks' },
  { name: 'MAGNESIUM GLYCINATE', dose: '400 mg', benefit: 'Nervous system, sleep', onset: 'days' },
  { name: 'MALIC ACID', dose: '250 mg', benefit: 'Energy, recovery', onset: 'post-exercise' },
  { name: 'MUCUNA PRURIENS', dose: '500 mg', benefit: 'Dopamine, testosterone', onset: '1–2 weeks' },
  { name: 'SHILAJIT', dose: '1 g', benefit: 'Mineral-rich adaptogen', onset: 'weeks' },
  { name: 'TONGKAT ALI', dose: '600 mg', benefit: 'Testosterone, libido, strength', onset: '2–3 weeks' },
  { name: 'TRIBULUS TERRESTRIS', dose: '1 g', benefit: 'Libido, performance', onset: '2–4 weeks' },
  { name: 'VITAMIN B12', dose: '200 mcg', benefit: 'Energy, nerve health', onset: 'days' },
  { name: 'VITAMIN B5', dose: '20 mg', benefit: 'Metabolism, adrenal', onset: 'subtle, weeks' },
  { name: 'VITAMIN B6', dose: '10 mg', benefit: 'Mood, neurotransmitter', onset: '1–2 weeks' },
  { name: 'VITAMIN B7', dose: '2 mg', benefit: 'Hair, skin, nails', onset: '4–6 weeks' },
  { name: 'VITAMIN D3', dose: '100 mcg', benefit: 'Immunity, hormone', onset: '2–6 weeks' },
  { name: 'YIN YANG HUO', dose: '1.25 g', benefit: 'Libido booster', onset: '2–3 weeks' },
  { name: 'YOHIMBE', dose: '50 mg', benefit: 'Blood flow, libido', onset: 'fast-acting' },
  { name: 'ZINC', dose: '30 mg', benefit: 'Testosterone, immunity', onset: 'over time' },
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

// Fetch Mandust products from our new API endpoint
const fetchMandustProducts = async (): Promise<{ products: MandustProduct[]; count: number }> => {
  const response = await fetch('/api/mandustProducts');
  if (!response.ok) {
    throw new Error('Failed to fetch Mandust products');
  }
  return response.json();
};

// Format interval display text
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

// Format price display
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

export default function Mandust() {
  const addItem = useCartStore((state) => state.addItem);
  const { visitorData, visitorId, jwt } = useVisitor();
  const orderRef = useRef<HTMLDivElement>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fetch Mandust products using TanStack Query
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['mandustProducts'],
    queryFn: fetchMandustProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get the first (primary) Mandust product and its prices
  const mandustProduct = productsData?.products?.[0];
  const availablePrices = mandustProduct?.prices || [];

  // Set default selected price to first available price
  useState(() => {
    if (availablePrices.length > 0 && !selectedPriceId) {
      setSelectedPriceId(availablePrices[0].id);
    }
  });

  // Handle checkout
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

  // Handle loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="site-section-bg min-h-screen flex items-center justify-center">
          <div className="text-surface-background text-xl">Loading Mandust products...</div>
        </div>
      </Layout>
    );
  }

  // Handle error state
  if (error || !mandustProduct) {
    return (
      <Layout>
        <div className="site-section-bg min-h-screen flex items-center justify-center">
          <div className="text-surface-background text-xl">
            {error ? 'Error loading Mandust products' : 'No Mandust products found'}
          </div>
        </div>
      </Layout>
    );
  }

  // Get selected price details
  const selectedPrice = availablePrices.find(p => p.id === selectedPriceId);

  return (
    <Layout>
      <div className="site-section-bg min-h-screen flex flex-col font-sans text-surface-background" style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}>
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center py-20 px-4 md:mx-24 mx-8">
          <h1 className="text-5xl md:text-6xl font-normal tracking-tight mb-6">MANDUST — The Best Testosterone Supplement Ever</h1>
          <p className="text-2xl md:text-3xl font-normal mb-8">Real energy. Real edge. Built from years of trial, not theory.</p>
          <button
            className="px-10 py-4 text-xl rounded bg-brand-secondary text-surface-background font-normal mb-6"
            onClick={scrollToOrder}
          >
            Try It
          </button>
          <p className="text-lg max-w-xl mx-auto mt-4">If you're over 30, your T is already slipping. Time to reclaim the edge.</p>
          <div className="mt-12 flex justify-center">
            <img
              src={mandustProduct.images[0] || "/media/card_art/card_01.webp"}
              alt="Mandust gritty product visual"
              className="w-72 h-72 object-cover rounded-lg grayscale contrast-125 border-2 border-neutral-border"
              style={{ background: 'transparent' }}
            />
          </div>
        </section>

        {/* Intro Copy Section */}
        <section className="md:mx-24 mx-8 my-12">
          <div className="w-full bg-transparent">
            <StyledText>
              {mandustProduct.description || `Once you hit 30 as a man — sometimes earlier depending on stress and lifestyle — your testosterone starts dropping fast. Low T means lower energy, slower metabolism, foggy focus, and less drive.\n\nThere are three pillars to healthy testosterone:\n- Exercise\n- Mental-emotional mastery (especially masculine work)\n- Nutrition\n\nSupplementation is part of pillar three. And Mandust does it right. It's the most complete, ratio-corrected T-support stack on the market. No fluff, no trendy filler — just results.`}
            </StyledText>
          </div>
        </section>

        {/* Founder's Story Block */}
        <section className="md:mx-24 mx-8 my-12">
          <div className="w-full bg-transparent">
            <h3 className="text-2xl font-normal mb-4">Founder's Story</h3>
            <p className="text-xl mb-3 font-normal">
              Mandust started when my own T levels crashed to 100 in my early 30s. That's dangerously low. I tried prescription TRT — short-term bandaid with long-term consequences.
            </p>
            <p className="text-xl mb-3 font-normal">
              So I spent 10 years testing supplements, researching ingredients, and refining ratios. I've tried it all — at one point I had a dozen different bottles on the shelf. Mandust is the final formula — real results from real effort.
            </p>
          </div>
        </section>

        {/* Flavor/Rite of Passage Block */}
        <section className="w-full py-12 md:mx-24 mx-8">
          <h3 className="text-3xl md:text-4xl font-normal mb-6 tracking-tight">Mandust doesn't taste like candy. It tastes like work. Like grit.</h3>
          <p className="text-xl font-normal mb-8">Real quotes from first-timers:</p>
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            {['"motor oil"', '"barn"', '"wet hay"', '"shoulder pads"', '"locker room"'].map((q) => (
              <span key={q} className="px-6 py-3 rounded-full font-normal text-lg border border-neutral-700" style={{ background: 'transparent' }}>{q}</span>
            ))}
          </div>
          <p className="text-xl font-normal mt-8">It's an acquired taste — and that's on purpose. This is not a drink mix. It's a rite of passage.</p>
        </section>

        {/* Ingredient Grid Section */}
        <section className="max-w-5xl mx-auto py-12 md:mx-24 mx-8">
          <h2 className="text-4xl font-normal mb-10 text-center tracking-tight">What's Inside Mandust?</h2>
          <div className="overflow-x-auto bg-transparent">
            <table className="min-w-full border-separate border-spacing-y-3 bg-transparent">
              <thead>
                <tr className="text-left text-xl">
                  <th className="px-3 py-3">Ingredient</th>
                  <th className="px-3 py-3">Dosage</th>
                  <th className="px-3 py-3">Benefit</th>
                  <th className="px-3 py-3">Onset</th>
                </tr>
              </thead>
              <tbody>
                {INGREDIENTS.map((ing) => (
                  <tr key={ing.name} className="text-lg" style={{ background: 'transparent' }}>
                    <td className="px-3 py-3 font-normal whitespace-nowrap">{ing.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{ing.dose}</td>
                    <td className="px-3 py-3">{ing.benefit}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{ing.onset}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Try It Section (Order) */}
        <section ref={orderRef} className="w-full py-12 md:mx-24 mx-8 text-center">
          <h2 className="text-4xl md:text-5xl font-normal mb-6 tracking-tight">Ready to Try Mandust?</h2>
          <p className="text-2xl md:text-3xl font-normal mb-8">If it works, you'll feel it in a week. If it doesn't, you'll know — but it will.</p>
          
          {/* Price Selection */}
          {availablePrices.length > 1 && (
            <div className="mb-8 flex justify-center">
              <select
                value={selectedPriceId}
                onChange={(e) => setSelectedPriceId(e.target.value)}
                className="px-6 py-3 text-lg bg-transparent border border-neutral-700 rounded text-surface-background"
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
            className="px-12 py-5 text-2xl rounded bg-brand-secondary text-surface-background font-normal mb-6 disabled:opacity-50"
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