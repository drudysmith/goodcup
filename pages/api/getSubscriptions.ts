import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

interface StripeProduct {
  id: string;
  name: string;
  description?: string;
}

interface BillingCycle {
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  amount: number;
}

interface StripeSubscription {
  id: string;
  stripe_subscription_id: string;
  created_at: string;
  start_date: string;
  current_period_end?: string;
  canceled_at?: string;
  amount: number;
  status: string;
  billing_cycle: BillingCycle;
  products: StripeProduct[];
  is_paused: boolean;
  pause_collection?: {
    behavior: 'keep_as_draft' | 'mark_uncollectible' | 'void';
    resumes_at?: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if Stripe secret key is available
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not configured');
    return res.status(500).json({ error: 'Stripe configuration error' });
  }

  const { customerId } = req.query;

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId is required' });
  }

  try {
    console.log('Fetching subscriptions for customer:', customerId);
    
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all', // Get all subscriptions including canceled ones
      limit: 100
    });

    console.log('Found subscriptions:', subscriptions.data.length);

    const subscriptionData: StripeSubscription[] = subscriptions.data.map((sub: Stripe.Subscription) => {
      try {
        // Get the first price item for billing info
        const firstPriceItem = sub.items.data[0];
        const price = firstPriceItem?.price;
        
        // Extract billing cycle information
        const billingCycle: BillingCycle = {
          interval: price?.recurring?.interval || 'month',
          interval_count: price?.recurring?.interval_count || 1,
          amount: price?.unit_amount || 0
        };

        // Extract all products from subscription items
        const products: StripeProduct[] = sub.items.data.map(item => {
          const productId = item.price.product;
          if (typeof productId === 'string') {
            return { id: productId, name: 'Product' };
          }
          // If we have product object (shouldn't happen without expand, but just in case)
          if (productId.deleted) {
            return { id: productId.id, name: 'Deleted Product' };
          }
          return {
            id: productId.id,
            name: productId.name || 'Product',
            description: productId.description || undefined
          };
        });

        return {
          id: sub.id,
          stripe_subscription_id: sub.id,
          created_at: new Date(sub.created * 1000).toISOString(),
          start_date: new Date((sub.start_date || sub.created) * 1000).toISOString(),
          current_period_end: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : undefined,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
          amount: billingCycle.amount,
          status: sub.status,
          billing_cycle: billingCycle,
          products,
          is_paused: sub.pause_collection !== null,
          pause_collection: sub.pause_collection ? {
            behavior: sub.pause_collection.behavior,
            resumes_at: sub.pause_collection.resumes_at || undefined
          } : undefined
        };
      } catch (mapError) {
        console.error('Error mapping subscription:', sub.id, mapError);
        // Return a basic subscription object if mapping fails
        return {
          id: sub.id,
          stripe_subscription_id: sub.id,
          created_at: new Date(sub.created * 1000).toISOString(),
          start_date: new Date(sub.created * 1000).toISOString(),
          amount: 0,
          status: sub.status,
          billing_cycle: {
            interval: 'month',
            interval_count: 1,
            amount: 0
          },
          products: [{ id: 'unknown', name: 'Unknown Product' }],
          is_paused: false
        };
      }
    });

    console.log('Processed subscriptions:', subscriptionData.length);
    res.status(200).json(subscriptionData);
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 