import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

interface StripeSubscription {
  id: string;
  stripe_subscription_id: string;
  created_at: string;
  current_period_end?: string;
  canceled_at?: string;
  amount: number;
  status: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId } = req.query;

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId is required' });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      expand: ['data.default_payment_method']
    });

    const subscriptionData: StripeSubscription[] = subscriptions.data.map((sub: Stripe.Subscription) => ({
      id: sub.id,
      stripe_subscription_id: sub.id,
      created_at: new Date(sub.created * 1000).toISOString(),
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
      amount: sub.items.data[0]?.price.unit_amount ?? 0,
      status: sub.status
    }));

    res.status(200).json(subscriptionData);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 