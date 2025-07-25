import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { addWebhookEvent } from './webhook-events';
import { supabaseServiceRole } from '../../lib/supabaseClient';
import { LOG_ENABLED } from '../../lib/utils/log';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

// Middleware to parse raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to convert the request stream to a buffer
function buffer(readable: any) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readable.on('data', (chunk: Buffer) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

// Module B: Helper to trigger client-side query invalidation
const notifyClientQueryInvalidation = async (eventType: string, metadata?: any) => {
  if (LOG_ENABLED) {
  console.log(`🔄 Module B: Query invalidation needed for event: ${eventType}`);
  }
  
  // Add event to the tracking system so clients can poll for updates
  addWebhookEvent(eventType, metadata);
  
  if (eventType === 'checkout.session.completed') {
    if (LOG_ENABLED) {
    console.log('📦 Module B: Should invalidate orders and subscriptions queries');
    }
  } else if (eventType.includes('subscription') || eventType === 'invoice.paid') {
    if (LOG_ENABLED) {
    console.log('📦 Module B: Should invalidate subscriptions queries');
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (LOG_ENABLED) {
  console.log("WEBHOOK: Stripe event received", req.body);
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const buf = await buffer(req);
    if (!sig || !webhookSecret) throw new Error('Missing Stripe signature or webhook secret');
    event = stripe.webhooks.constructEvent(buf, sig as string, webhookSecret);
    
    // Module B: Required logging
    if (LOG_ENABLED) {
    console.log(`📦 Stripe webhook received: ${event.type}`);
    }
  } catch (err: any) {
    if (LOG_ENABLED) {
    console.error('Webhook signature verification failed:', err.message);
    }
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --- 8D.3: Stripe Webhook Delivery Verification ---
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    if (LOG_ENABLED) {
      console.warn('⚠️ Bug 8D.3: STRIPE_WEBHOOK_SECRET is not set. Stripe webhooks will not verify. Make sure Stripe CLI or live webhooks are forwarding events to /api/stripeWebhook.');
    }
  }
  // --- END 8D.3 ---

  // Module B: Handle checkout.session.completed events
  if (event.type === 'checkout.session.completed') {
    // --- 8D.3: Enhanced Logging ---
    if (!event.data || !event.data.object) {
      if (LOG_ENABLED) {
        console.error('📦 Bug 8D.3: checkout.session.completed event missing data.object');
      }
    }
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeCustomerId = session.customer as string;
    const email = session.customer_email || session.customer_details?.email;
    const supabaseUserId = session.metadata?.supabase_user_id || null;
    const visitorId = session.metadata?.visitor_id || null;

    if (!stripeCustomerId) {
      if (LOG_ENABLED) {
        console.error('📦 Bug 8D.3: Stripe customer ID missing in session object');
      }
    }
    if (!supabaseUserId && !visitorId) {
      if (LOG_ENABLED) {
        console.error('📦 Bug 8D.3: No user_id or visitor_id in session metadata - cannot update stripe_cust_id');
      }
    }
    // --- END 8D.3 ---

    if (LOG_ENABLED) {
    console.log('🔥 Handling checkout.session.completed');
    console.log('🧾 Session ID:', session.id);
    console.log('👤 Stripe customer:', session.customer);
    console.log('📧 Email fallback:', session.customer_email || session.customer_details?.email);
    console.log('🧍 Supabase user ID from metadata:', session.metadata?.supabase_user_id);
    console.log('👥 Visitor ID from metadata:', session.metadata?.visitor_id);
    }

    // Module B: Notify that orders and subscriptions should be refreshed
    await notifyClientQueryInvalidation('checkout.session.completed', {
      sessionId: session.id,
      customerId: stripeCustomerId,
      supabaseUserId
    });

    // SMU 4.3a: Update visitor table with stripe_cust_id
    if (stripeCustomerId) {
      try {
        let updateResult;
        
        if (supabaseUserId) {
          // Update visitor record by user_id (authenticated user)
          updateResult = await supabaseServiceRole
            .from('visitors')
            .update({ stripe_cust_id: stripeCustomerId })
            .eq('user_id', supabaseUserId);
          
          if (LOG_ENABLED) {
          console.log('💾 SMU 4.3a: Updated stripe_cust_id for authenticated user:', supabaseUserId);
          }
        } else if (visitorId) {
          // Update visitor record by visitor_id (guest user)
          updateResult = await supabaseServiceRole
            .from('visitors')
            .update({ stripe_cust_id: stripeCustomerId })
            .eq('id', visitorId);
          
          if (LOG_ENABLED) {
          console.log('💾 SMU 4.3a: Updated stripe_cust_id for visitor:', visitorId);
          }
        } else {
          if (LOG_ENABLED) {
          console.log('⚠️ SMU 4.3a: No user_id or visitor_id in session metadata - cannot update stripe_cust_id');
          }
        }
        
        if (updateResult?.error) {
          if (LOG_ENABLED) {
          console.error('💾 SMU 4.3a: Error updating stripe_cust_id:', updateResult.error);
          }
        } else {
          if (LOG_ENABLED) {
          console.log('✅ SMU 4.3a: Successfully updated stripe_cust_id:', stripeCustomerId);
            console.log('📦 Bug 8D.3: Stripe webhook verified on successful processing.');
          }
        }
      } catch (error) {
        if (LOG_ENABLED) {
        console.error('💾 SMU 4.3a: Exception updating stripe_cust_id:', error);
        }
      }
    }
  }

  // Module B: Handle subscription-related events
  if (
    event.type === 'invoice.paid' ||
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    if (LOG_ENABLED) {
    console.log(`🔄 Processing subscription event: ${event.type}`);
    }
    let subscription: Stripe.Subscription | undefined;
    let stripeCustomerId: string | undefined;
    
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription;
      stripeCustomerId = invoice.customer as string;
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } else {
      subscription = event.data.object as Stripe.Subscription;
      stripeCustomerId = subscription.customer as string;
    }
    
    if (!subscription || !stripeCustomerId) {
      if (LOG_ENABLED) {
      console.error('Missing subscription or customer ID');
      }
      return res.status(400).json({ error: 'Missing subscription or customer ID' });
    }
    
    if (LOG_ENABLED) {
    console.log(`📋 Subscription ${subscription.id} status: ${subscription.status}`);
    console.log(`📅 Current period end: ${(subscription as any).current_period_end}`);
    console.log(`🚫 Cancel at period end: ${(subscription as any).cancel_at_period_end}`);
    
    // Log specific cancellation events
    if (event.type === 'customer.subscription.deleted') {
      if (LOG_ENABLED) {
      console.log(`🗑️ CANCELLATION: Subscription ${subscription.id} was deleted/canceled`);
      }
    } else if (event.type === 'customer.subscription.updated' && subscription.status === 'canceled') {
      if (LOG_ENABLED) {
      console.log(`❌ CANCELLATION: Subscription ${subscription.id} status updated to canceled`);
      }
    } else if (event.type === 'customer.subscription.updated' && (subscription as any).cancel_at_period_end) {
      if (LOG_ENABLED) {
      console.log(`⏰ CANCELLATION SCHEDULED: Subscription ${subscription.id} will cancel at period end`);
      }
      }
    }
    
    // Module B: Notify that subscriptions should be refreshed
    await notifyClientQueryInvalidation(event.type, {
      subscriptionId: subscription.id,
      customerId: stripeCustomerId,
      status: subscription.status
    });
    
    // TODO: Add visitor table operations here when ready
    if (LOG_ENABLED) {
    console.log('💾 Database operations removed - subscription event processed successfully');
    }
  }

  // Module B: Respond quickly to Stripe to avoid retries
  res.status(200).json({ received: true, type: event.type });
} 