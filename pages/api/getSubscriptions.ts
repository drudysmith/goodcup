import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId } = req.query;
    
    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Fetch subscriptions from Stripe for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      expand: ['data.items.data.price']
    });

    // Transform to match dashboard format
    const subs = subscriptions.data.map(sub => ({
      id: `sub_${sub.id}`,
      stripe_subscription_id: sub.id,
      created_at: new Date(sub.created * 1000).toISOString(),
      current_period_end: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : undefined,
      canceled_at: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000).toISOString() : undefined,
      amount: sub.items.data.reduce((total, item) => total + (item.price.unit_amount || 0), 0),
      status: sub.status
    }));

    res.status(200).json(subs);
  } catch (error: any) {
    console.error('Failed to fetch subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
} 