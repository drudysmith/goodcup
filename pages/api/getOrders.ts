import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId } = req.query;
    
    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Fetch payment intents (orders) from Stripe for the customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
      expand: ['data.charges.data']
    });

    // Transform to match dashboard format
    const orders = paymentIntents.data
      .filter(pi => pi.status === 'succeeded')
      .map(pi => ({
        id: `order_${pi.id}`,
        stripe_payment_intent_id: pi.id,
        created_at: new Date(pi.created * 1000).toISOString(),
        amount: pi.amount
      }));

    res.status(200).json(orders);
  } catch (error: any) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
} 