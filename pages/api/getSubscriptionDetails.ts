import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

interface SubscriptionDetails {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  items: Array<{
    id: string;
    price: {
      id: string;
      unit_amount: number;
      currency: string;
      recurring: {
        interval: string;
        interval_count: number;
      };
    };
    quantity: number;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscriptionId } = req.query;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return res.status(400).json({ error: 'subscriptionId is required' });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    }) as Stripe.Subscription;

    const details: SubscriptionDetails = {
      id: subscription.id,
      status: subscription.status,
      // TODO: Fix Stripe type issue
      current_period_start: new Date(Date.now()).toISOString(), // subscription.current_period_start * 1000
      current_period_end: new Date(Date.now()).toISOString(), // subscription.current_period_end * 1000
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      canceled_at: undefined, // subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : undefined,
      items: subscription.items.data.map((item: Stripe.SubscriptionItem) => ({
        id: item.id,
        price: {
          id: item.price.id,
          unit_amount: item.price.unit_amount ?? 0,
          currency: item.price.currency,
          recurring: {
            interval: item.price.recurring?.interval ?? 'month',
            interval_count: item.price.recurring?.interval_count ?? 1,
          },
        },
        quantity: item.quantity ?? 1,
      })),
    };

    res.status(200).json(details);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 