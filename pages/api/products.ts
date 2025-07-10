import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let status = 'init';
  try {
    status = 'check_env';
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }

    status = 'stripe_connect';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

    status = 'fetch_products';
    const products = await stripe.products.list({ active: true, limit: 100 });

    status = 'fetch_prices';
    const prices = await stripe.prices.list({ active: true, limit: 100 });

    status = 'filter_products';
    const filteredProducts = products.data.filter(
      (product) => product.metadata['show-on-site'] === 'true'
    );

    status = 'map_prices';
    const productMap = filteredProducts.map((product) => {
      const productPrices = prices.data.filter(
        (price) => price.product === product.id
      );
      return {
        ...product,
        prices: productPrices,
      };
    });

    status = 'success';
    res.status(200).json({ status, products: productMap });
  } catch (error: any) {
    res.status(500).json({ status, error: error.message || 'Internal server error' });
  }
} 