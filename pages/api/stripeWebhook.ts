import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServiceRole } from '../../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const event = req.body;

  try {
    // Verify webhook signature if secret is available
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }
    }

    const eventType = event.type;

    // Module B: Query invalidation for specific events
    if (eventType === 'checkout.session.completed' || 
        eventType === 'invoice.paid' || 
        eventType === 'customer.subscription.created' ||
        eventType === 'customer.subscription.updated' ||
        eventType === 'customer.subscription.deleted') {
      
      if (eventType === 'checkout.session.completed') {
        // Invalidate orders and subscriptions queries
      } else {
        // Invalidate subscriptions queries only
      }
    }

    // Handle checkout.session.completed events
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (!session) {
        return res.status(400).json({ error: 'Missing session data' });
      }

      const stripeCustomerId = session.customer as string;
      if (!stripeCustomerId) {
        return res.status(400).json({ error: 'Missing customer ID' });
      }

      const supabaseUserId = session.metadata?.supabase_user_id;
      const visitorId = session.metadata?.visitor_id;

      if (supabaseUserId) {
        // Update authenticated user's stripe_cust_id
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update({ stripe_cust_id: stripeCustomerId })
          .eq('user_id', supabaseUserId);

        if (updateResult) {
          return res.status(500).json({ error: 'Failed to update user stripe_cust_id' });
        }
      } else if (visitorId) {
        // Update visitor's stripe_cust_id
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update({ stripe_cust_id: stripeCustomerId })
          .eq('id', visitorId);

        if (updateResult) {
          return res.status(500).json({ error: 'Failed to update visitor stripe_cust_id' });
        }
      }
    }

    // Handle subscription events
    if (eventType.includes('subscription')) {
      const subscription = event.data.object as Stripe.Subscription;
      
      if (!subscription || !subscription.customer) {
        return res.status(400).json({ error: 'Missing subscription or customer ID' });
      }

      const stripeCustomerId = subscription.customer as string;
      const subscriptionStatus = subscription.status;

      if (subscriptionStatus === 'deleted') {
        // Handle subscription deletion
      } else if (subscriptionStatus === 'canceled') {
        // Handle subscription cancellation
      } else if (subscription.cancel_at_period_end) {
        // Handle scheduled cancellation
      }
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 