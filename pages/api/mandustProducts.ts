import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { LOG_ENABLED } from '../../lib/utils/log';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }

    if (LOG_ENABLED) {
      console.log('🔍 Fetching Mandust products from Stripe');
    }

    // Fetch all active products and expand prices in one call
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.prices']
    });

    if (LOG_ENABLED) {
      console.log(`📦 Found ${products.data.length} total active products`);
    }

    // Filter products that have metadata key "mandust" set to "true"
    const mandustProducts = products.data.filter(
      (product) => product.metadata?.mandust === 'true'
    );

    if (LOG_ENABLED) {
      console.log(`🎯 Found ${mandustProducts.length} Mandust products`);
    }

    // Transform and filter prices for each product
    const productMap: MandustProduct[] = mandustProducts.map((product) => {
      // Get all prices for this product (already expanded)
      const allPrices = (product as any).prices?.data || [];
      
      // Filter to only active recurring prices
      const activePrices = allPrices.filter((price: any) => 
        price.active === true && 
        price.type === 'recurring' && 
        price.recurring !== null
      );

      if (LOG_ENABLED) {
        console.log(`💰 Product ${product.name}: ${activePrices.length} active recurring prices`);
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        metadata: product.metadata,
        prices: activePrices.map((price: any) => ({
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          type: price.type,
          active: price.active
        }))
      };
    });

    if (LOG_ENABLED) {
      console.log('✅ Mandust products fetched successfully');
    }

    res.status(200).json({ 
      products: productMap,
      count: productMap.length 
    });

  } catch (error: any) {
    if (LOG_ENABLED) {
      console.error('❌ Error fetching Mandust products:', error);
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 