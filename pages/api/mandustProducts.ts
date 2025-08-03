import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-07-30.basil',
});

interface MandustProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  prices: Array<{
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring?: { 
      interval: string;
      interval_count: number;
    };
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all active products from Stripe
    const products = await stripe.products.list({ active: true });

    // Filter for Mandust products (products with 'mandust' in the name)
    const mandustProducts: MandustProduct[] = [];

    for (const product of products.data) {
      if (product.name.toLowerCase().includes('mandust')) {
        // Get prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          expand: ['data.recurring']
        });

        // Filter for recurring prices only
        const activePrices = prices.data.filter(price => 
          price.recurring && price.recurring.interval
        );

        if (activePrices.length > 0) {
          mandustProducts.push({
            id: product.id,
            name: product.name,
            description: product.description,
            images: product.images,
            prices: activePrices.map(price => ({
              id: price.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring ? {
                interval: price.recurring.interval,
                interval_count: price.recurring.interval_count
              } : undefined
            }))
          });
        }
      }
    }

    res.status(200).json({ products: mandustProducts });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 