import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("WEBHOOK: Stripe event received", req.body);

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
    console.log('📦 Stripe webhook received:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log("WEBHOOK: Handling checkout.session.completed", event.data.object);
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeCustomerId = session.customer as string;
    const email = session.customer_email || session.customer_details?.email;
    const supabaseUserId = session.metadata?.supabase_user_id || null;

    console.log('🔥 Handling checkout.session.completed');
    console.log('🧾 Session ID:', session.id);
    console.log('👤 Stripe customer:', session.customer);
    console.log('📧 Email fallback:', session.customer_email || session.customer_details?.email);
    console.log('🧍 Supabase user ID from metadata:', session.metadata?.supabase_user_id);

    // TODO: Add visitor table operations here when ready
    console.log('💾 Database operations removed - checkout completed successfully');
  }

  // Handle subscription-related events
  if (
    event.type === 'invoice.paid' ||
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    console.log(`🔄 Processing subscription event: ${event.type}`);
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
      console.error('Missing subscription or customer ID');
      return res.status(400).json({ error: 'Missing subscription or customer ID' });
    }
    
    console.log(`📋 Subscription ${subscription.id} status: ${subscription.status}`);
    console.log(`📅 Current period end: ${(subscription as any).current_period_end}`);
    console.log(`🚫 Cancel at period end: ${(subscription as any).cancel_at_period_end}`);
    
    // Log specific cancellation events
    if (event.type === 'customer.subscription.deleted') {
      console.log(`🗑️ CANCELLATION: Subscription ${subscription.id} was deleted/canceled`);
    } else if (event.type === 'customer.subscription.updated' && subscription.status === 'canceled') {
      console.log(`❌ CANCELLATION: Subscription ${subscription.id} status updated to canceled`);
    } else if (event.type === 'customer.subscription.updated' && (subscription as any).cancel_at_period_end) {
      console.log(`⏰ CANCELLATION SCHEDULED: Subscription ${subscription.id} will cancel at period end`);
    }
    
    // TODO: Add visitor table operations here when ready
    console.log('💾 Database operations removed - subscription event processed successfully');
  }

  // For now, just acknowledge receipt
  res.status(200).json({ received: true, type: event.type });
} 