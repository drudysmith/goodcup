import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServiceRole } from '../../lib/supabaseClient';
import { QueryClient } from '@tanstack/react-query';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
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
//    console.log('🚀 WEBHOOK: Received event', eventType);

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
      const orderIdFromSession = session.metadata?.order_id as string | undefined;

      // Link the exact paid Stripe object to the exact fulfillment row carried
      // in Checkout metadata. If the row is unexpectedly missing, return an
      // error so Stripe retries the webhook instead of recording a false success.
      if (orderIdFromSession) {
        const stripeReference = session.mode === 'subscription'
          ? (typeof session.subscription === 'string' ? session.subscription : session.subscription?.id)
          : (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id);

        if (!stripeReference) {
          throw new Error(`Completed Checkout Session ${session.id} has no Stripe order reference`);
        }

        const { data: linkedOrder, error: linkOrderError } = await supabaseServiceRole
          .from('shipment_orders')
          .update({ order_type: stripeReference, status: 'paid' })
          .eq('order_id', orderIdFromSession)
          .select('order_id')
          .maybeSingle();

        if (linkOrderError) throw linkOrderError;
        if (!linkedOrder) {
          throw new Error(`Shipment order ${orderIdFromSession} is missing for completed Checkout Session ${session.id}`);
        }
      } else if (session.payment_link) {
        // Stripe Payment Links do not pass through Goodcup's shipping form.
        // Keep the event successful and surface it as Stripe-only in the admin
        // order center; there is no trustworthy recipient address to invent.
        console.warn(`Stripe Payment Link Checkout Session ${session.id} has no Goodcup shipment order`);
      } else {
        throw new Error(`Completed Checkout Session ${session.id} is missing order_id metadata`);
      }

      // Update shipment_orders.order_info with the FINAL paid line items from the Checkout Session
      if (orderIdFromSession) {
        try {
//          console.log('🚀 WEBHOOK: checkout.session.completed – fetching line items to record order_info', { sessionId: session.id, orderId: orderIdFromSession });
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
            expand: ['data.price.product'],
          });

          const orderInfo = lineItems.data.map((li: any) => {
            const priceId = typeof li.price === 'string' ? li.price : li.price?.id;
            let productId: string | null = null;
            if (li.price && typeof li.price !== 'string') {
              const prod = li.price.product;
              if (typeof prod === 'string') {
                productId = prod;
              } else if (prod && typeof prod === 'object' && prod.id) {
                productId = prod.id;
              }
            }
            return {
              productId,
              priceId,
              quantity: li.quantity || 1,
            };
          });

          const { error: updateOrderInfoError } = await supabaseServiceRole
            .from('shipment_orders')
            .update({ order_info: orderInfo })
            .eq('order_id', orderIdFromSession);

          if (updateOrderInfoError) {
            console.error('🚀 WEBHOOK: Failed to update shipment_orders.order_info', { orderId: orderIdFromSession, error: updateOrderInfoError });
          } else {
//            console.log('🚀 WEBHOOK: Updated shipment_orders.order_info from session line items', { orderId: orderIdFromSession, itemCount: orderInfo.length });
          }
        } catch (err) {
          console.error('🚀 WEBHOOK: Error fetching/writing line items for order_info', { sessionId: session.id, orderId: orderIdFromSession, error: err });
        }
      } else {
//        console.log('🚀 WEBHOOK: checkout.session.completed – no order_id in session metadata; skipping order_info update');
      }
      
      // Check if a promo code was used and update shipment order
      if (session.discounts && session.discounts.length > 0) {
        const promoCodeId = session.discounts[0].promotion_code as string;
        if (promoCodeId) {
          // Prefer updating by explicit order_id from session metadata
          if (orderIdFromSession) {
//            console.log('🚀 WEBHOOK: Applying promo_used by order_id', { orderId: orderIdFromSession, promoCodeId });
            const { error: promoByOrderIdError } = await supabaseServiceRole
              .from('shipment_orders')
              .update({ promo_used: promoCodeId })
              .eq('order_id', orderIdFromSession);
            if (promoByOrderIdError) {
              console.error('🚀 WEBHOOK: Failed to set promo_used by order_id', { orderId: orderIdFromSession, error: promoByOrderIdError });
            } else {
//              console.log('🚀 WEBHOOK: Set promo_used by order_id', { orderId: orderIdFromSession });
            }
          } else if (visitorId) {
            // Fallback: latest pending order for visitor without promo_used
            const { data: shipmentOrders, error: fetchError } = await supabaseServiceRole
              .from('shipment_orders')
              .select('order_id')
              .eq('purchasing_visitor_id', visitorId)
              .is('promo_used', null)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!fetchError && shipmentOrders && shipmentOrders.length > 0) {
              const orderId = shipmentOrders[0].order_id;
//              console.log('🚀 WEBHOOK: Applying promo_used by visitor fallback', { orderId, promoCodeId, visitorId });
              const { error: updateError } = await supabaseServiceRole
                .from('shipment_orders')
                .update({ promo_used: promoCodeId })
                .eq('order_id', orderId);

              if (updateError) {
                console.error('🚀 WEBHOOK: Error updating promo_used via visitor fallback', updateError);
              } else {
//                console.log('🚀 WEBHOOK: Set promo_used via visitor fallback', { orderId });
              }
            }
          } else {
//            console.log('🚀 WEBHOOK: Promo present but no order_id or visitor_id to apply');
          }
        }
      }
      
      if (supabaseUserId) {
        // Update authenticated user's stripe_cust_id and clear cart
//         console.log('[visitor id] updated IN db for user', supabaseUserId);
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update({ stripe_cust_id: stripeCustomerId, cart: [] })
          .eq('user_id', supabaseUserId);

        if (updateResult) {
          return res.status(500).json({ error: 'Failed to update user stripe_cust_id' });
        }
      } else if (visitorId) {
        // Update visitor's stripe_cust_id and clear cart
//         console.log('[visitor id] updated IN db', visitorId.substring(0, 4) + '...');
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
      const subscriptionId = subscription.id;
//      console.log('🚀 WEBHOOK: Subscription event details', { eventType, subscriptionId, subscriptionStatus, stripeCustomerId });

      // Handle subscription creation - update shipment order with order_type
      if (eventType === 'customer.subscription.created' && subscriptionStatus === 'active') {
        let orderId: string | undefined = subscription.metadata?.order_id;

        // Legacy subscriptions created before order_id was copied onto the
        // Subscription can still be linked through their exact Checkout Session.
        if (!orderId) {
          const sessions = await stripe.checkout.sessions.list({ customer: stripeCustomerId, limit: 10 });
          const exactSession = sessions.data.find((session) => {
            const sessionSubscriptionId = typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;
            return sessionSubscriptionId === subscriptionId;
          });
          orderId = exactSession?.metadata?.order_id;
        }

        if (orderId) {
          const { data: linkedOrder, error: updateError } = await supabaseServiceRole
            .from('shipment_orders')
            .update({ order_type: subscriptionId, status: 'paid' })
            .eq('order_id', orderId)
            .select('order_id')
            .maybeSingle();

          if (updateError) throw updateError;
          if (!linkedOrder) throw new Error(`Shipment order ${orderId} is missing for subscription ${subscriptionId}`);
        }
      }

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
    console.error('Stripe webhook processing failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
