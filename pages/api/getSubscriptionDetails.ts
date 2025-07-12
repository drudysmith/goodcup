import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { LOG_ENABLED } from '../../lib/utils/log';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });

    // Extract product information
    const items = subscription.items.data.map(item => ({
      product_name: (item.price.product as Stripe.Product).name,
      price: item.price.unit_amount || 0,
      quantity: item.quantity || 1,
      interval: item.price.recurring?.interval || 'month'
    }));

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.status(200).json({
      items,
      total,
      status: subscription.status,
      current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
      current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
      billing_cycle_anchor: (subscription as any).billing_cycle_anchor ? new Date((subscription as any).billing_cycle_anchor * 1000).toISOString() : null,
      cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
      canceled_at: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
      trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
      next_payment_amount: total // Amount that will be charged next billing cycle
    });

  } catch (error: any) {
    if (LOG_ENABLED) {
    console.error('Failed to fetch subscription details:', error);
    }
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
} 