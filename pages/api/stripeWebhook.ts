import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServiceRole } from '../../lib/supabaseClient';
import { QueryClient } from '@tanstack/react-query';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

// Disable body parsing to handle raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read raw body
const getRawBody = (req: NextApiRequest): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    
    // Verify webhook signature if secret is available
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }
    } else {
      // Parse JSON manually if no signature verification
      event = JSON.parse(rawBody.toString());
    }

    const eventType = event.type;

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
        // Update authenticated user's stripe_cust_id and clear cart
        console.log('[visitor id] updated IN db for user', supabaseUserId);
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update({ stripe_cust_id: stripeCustomerId, cart: [] })
          .eq('user_id', supabaseUserId);

        if (updateResult) {
          return res.status(500).json({ error: 'Failed to update user stripe_cust_id' });
        }
      } else if (visitorId) {
        // Update visitor's stripe_cust_id and clear cart
        console.log('[visitor id] updated IN db', visitorId.substring(0, 4) + '...');
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update({ stripe_cust_id: stripeCustomerId, cart: [] })
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

      if (subscriptionStatus === 'canceled') {
        // Handle subscription cancellation
      } else if (subscriptionStatus === 'incomplete_expired') {
        // Handle incomplete/expired subscription
      } else if (subscription.cancel_at_period_end) {
        // Handle scheduled cancellation
      }
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 