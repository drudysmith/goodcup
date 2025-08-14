import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, customerId, customerEmail, supabaseUserId, visitorId, visitorJwt, checkoutMode, orderId, stripeMode, successRedirect, cancelRedirect } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      try {
        /*console.log('[CreateCheckoutSession] Early guard: no items', {
          hasItems: !!items,
          isArray: Array.isArray(items),
          length: Array.isArray(items) ? items.length : undefined,
          bodyKeys: Object.keys(req.body || {}),
          checkoutMode,
          stripeMode,
        });*/
      } catch {}
      return res.status(400).json({ error: 'No items in cart' });
    }

    let stripeCustomerId = customerId || null;
    if (!stripeCustomerId && customerEmail) {
      // Search for existing Stripe customer by email
      const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      }
    }

    const line_items = items.map((item: { priceId: string; quantity: number }) => ({
      price: item.priceId,
      quantity: item.quantity,
    }));

    // Build metadata based on checkout mode
    const metadata: any = {
      checkout_mode: checkoutMode || 'guest',
    };

    if (supabaseUserId) {
      metadata.supabase_user_id = supabaseUserId;
    }

    if (visitorId) {
      metadata.visitor_id = visitorId;
    }

    if (orderId) {
      metadata.order_id = orderId;
    }

    const sessionConfig: any = {
      payment_method_types: ['card'],
      mode: stripeMode === 'payment' ? 'payment' : 'subscription',
      line_items,
      success_url: successRedirect || `${req.headers.origin}/checkout?success=1`,
      cancel_url: cancelRedirect || `${req.headers.origin}/checkout?canceled=1`,
      ...(stripeCustomerId ? { customer: stripeCustomerId }
        : {
            customer_email: customerEmail,
          }),
      metadata,
      allow_promotion_codes: true,
    };

    // Debug log for server context
//    try {
//      console.log('[CreateCheckoutSession] Incoming', {
//        mode: sessionConfig.mode,
//        lineItemsCount: line_items?.length,
//        hasCustomer: !!sessionConfig.customer,
//        hasCustomerEmail: !!sessionConfig.customer_email,
//        metadata,
//      });
//    } catch {}

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ url: session.url, stripeCustomerId, customerEmail, supabaseUserId, visitorId, visitorJwt: visitorJwt ? 'present' : 'not provided', checkoutMode });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 
