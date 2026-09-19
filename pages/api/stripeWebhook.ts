import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServiceRole } from '../../lib/supabaseClient';
import { kdsSnapshotFromPaymentIntent } from '../../lib/kdsStripe';
import { createScripManageToken } from '../../lib/server/scripLinks';
import { persistStripeSubscription } from '../../lib/server/supabaseSubscriptions';
import { sendGoodcupText } from '../../lib/server/twilio';

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    
    if (!webhookSecret || typeof sig !== 'string') {
      return res.status(503).json({ error: 'Stripe webhook verification is not configured' });
    }
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    const eventType = event.type;
//    console.log('🚀 WEBHOOK: Received event', eventType);

    // Handle checkout.session.completed events
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (!session) {
        return res.status(400).json({ error: 'Missing session data' });
      }

      // Stripe Customers are optional for one-time Checkout Sessions. New
      // Goodcup sessions request customer creation, but older/in-flight guest
      // sessions must still be fulfilled using their order_id and PaymentIntent.
      const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || null;

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
      } else if (session.metadata?.scrip_campaign === 'true') {
        // The market subscription funnel is fulfilled by Stripe and uses its
        // verified success screen as the free-pouch proof. It intentionally
        // does not create a standard shipment_orders row.
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
        const visitorUpdate = stripeCustomerId
          ? { stripe_cust_id: stripeCustomerId, cart: [] }
          : { cart: [] };
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update(visitorUpdate)
          .eq('user_id', supabaseUserId);

        if (updateResult) {
          return res.status(500).json({ error: 'Failed to update user stripe_cust_id' });
        }
      } else if (visitorId) {
        // Update visitor's stripe_cust_id and clear cart
//         console.log('[visitor id] updated IN db', visitorId.substring(0, 4) + '...');
        const visitorUpdate = stripeCustomerId
          ? { stripe_cust_id: stripeCustomerId, cart: [] }
          : { cart: [] };
        const { error: updateResult } = await supabaseServiceRole
          .from('visitors')
          .update(visitorUpdate)
          .eq('id', visitorId);

        if (updateResult) {
          return res.status(500).json({ error: 'Failed to update visitor stripe_cust_id' });
        }
      }
    }

    // The kiosk backend places its validated cart snapshot on the PaymentIntent.
    // Stripe's verified success event is the trusted handoff into the KDS.
    if (eventType === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const snapshot = kdsSnapshotFromPaymentIntent(
        paymentIntent,
        new Date(event.created * 1000).toISOString(),
      );

      if (snapshot) {
        // Fulfillment status is intentionally omitted. The database default
        // initializes new orders while webhook retries preserve employee work.
        const { data: linkedOrder, error: updateError } = await supabaseServiceRole
          .from('kds_orders')
          .upsert(snapshot, { onConflict: 'id' })
          .select('id')
          .maybeSingle();

        if (updateError) throw updateError;
        if (!linkedOrder) {
          throw new Error(`Unable to persist KDS order for successful PaymentIntent ${paymentIntent.id}`);
        }
      }
    }

    // Stripe emits invoice.upcoming according to the lead time configured in
    // Billing settings. Goodcup configures that lead time to seven days. Only
    // subscriptions created by /scrip and carrying explicit SMS consent enter
    // this transactional reminder flow.
    if (eventType === 'invoice.upcoming') {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceData = invoice as any;
      const subscriptionId = typeof invoiceData.subscription === 'string'
        ? invoiceData.subscription
        : typeof invoiceData.parent?.subscription_details?.subscription === 'string'
          ? invoiceData.parent.subscription_details.subscription
          : typeof invoiceData.lines?.data?.[0]?.parent?.subscription_item_details?.subscription === 'string'
            ? invoiceData.lines.data[0].parent.subscription_item_details.subscription
            : null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (
          subscription.metadata.scrip_campaign === 'true' &&
          subscription.metadata.sms_renewal_consent === 'true' &&
          subscription.metadata.scrip_last_reminder_event !== event.id
        ) {
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.phone) {
            const renewalAt = Number(invoiceData.period_end || invoiceData.lines?.data?.[0]?.period?.end || 0);
            const expiresAt = Math.max(Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60), renewalAt + (2 * 24 * 60 * 60));
            const token = createScripManageToken({ customerId, subscriptionId, expiresAt });
            const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://goodcup.me').replace(/\/$/, '');
            const manageUrl = `${siteUrl}/api/scrip/manage?token=${encodeURIComponent(token)}`;
            const productName = subscription.metadata.scrip_product_name || 'Goodcup';
            await sendGoodcupText(
              customer.phone,
              `Goodcup heads-up: your ${productName} subscription renews in 7 days. Keep it? No action needed. Want to cancel? No sweat: ${manageUrl} Reply STOP to opt out.`,
            );
            await stripe.subscriptions.update(subscriptionId, {
              metadata: {
                scrip_last_reminder_event: event.id,
                scrip_last_reminder_period_end: renewalAt ? String(renewalAt) : 'unknown',
              },
            });
          }
        }
      }
    }

    // Mirror Stripe's subscription lifecycle into Supabase. Upserting on the
    // Stripe subscription ID makes webhook retries idempotent.
    if (eventType.startsWith('customer.subscription.')) {
      const subscription = event.data.object as Stripe.Subscription;
      
      if (!subscription || !subscription.customer) {
        return res.status(400).json({ error: 'Missing subscription or customer ID' });
      }

      const stripeCustomerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
      const subscriptionStatus = subscription.status;
      const subscriptionId = subscription.id;
//      console.log('🚀 WEBHOOK: Subscription event details', { eventType, subscriptionId, subscriptionStatus, stripeCustomerId });

      await persistStripeSubscription(stripe, subscription, event);

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
