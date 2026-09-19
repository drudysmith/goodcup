import type Stripe from 'stripe';
import { v5 as uuidv5 } from 'uuid';
import { supabaseServiceRole } from '../supabaseClient';

function stripeObjectId(value: string | { id?: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id || null;
}

export async function persistScripShipmentOrder(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  purchasedAt: string,
) {
  const subscriptionId = stripeObjectId(session.subscription);
  if (!subscriptionId) {
    throw new Error(`Scrip Checkout Session ${session.id} has no subscription ID`);
  }

  const stripeCustomerId = stripeObjectId(session.customer);
  if (!stripeCustomerId) {
    throw new Error(`Scrip Checkout Session ${session.id} has no customer ID`);
  }

  const retrievedCustomer = typeof session.customer === 'string'
    ? await stripe.customers.retrieve(stripeCustomerId)
    : session.customer;
  if (!retrievedCustomer || retrievedCustomer.deleted) {
    throw new Error(`Stripe customer ${stripeCustomerId} is unavailable for Scrip order ${session.id}`);
  }

  const address = retrievedCustomer.shipping?.address
    || retrievedCustomer.address
    || session.customer_details?.address;
  const recipientName = retrievedCustomer.shipping?.name
    || retrievedCustomer.name
    || session.customer_details?.name;
  const phone = retrievedCustomer.shipping?.phone
    || retrievedCustomer.phone
    || session.customer_details?.phone;
  const email = retrievedCustomer.email || session.customer_details?.email;

  if (!recipientName || !address?.line1 || !address.city || !address.state || !address.postal_code || !address.country || !email) {
    throw new Error(`Scrip Checkout Session ${session.id} is missing required shipment details`);
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });
  const orderInfo = lineItems.data.map((lineItem) => {
    const price = lineItem.price;
    const priceId = price?.id || null;
    const productId = price ? stripeObjectId(price.product) : null;
    if (!priceId || !productId) {
      throw new Error(`Scrip Checkout Session ${session.id} has an incomplete Stripe line item`);
    }
    return {
      priceId,
      quantity: lineItem.quantity || 1,
      productId,
    };
  });

  if (orderInfo.length === 0) {
    throw new Error(`Scrip Checkout Session ${session.id} has no line items`);
  }

  const orderId = uuidv5(`https://goodcup.me/scrip/checkout/${session.id}`, uuidv5.URL);
  const { data, error } = await supabaseServiceRole
    .from('shipment_orders')
    .upsert({
      order_id: orderId,
      recipient_name: recipientName,
      address_line1: address.line1,
      address_line2: address.line2 || null,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      order_info: orderInfo,
      created_at: purchasedAt,
      fulfilled_at: null,
      gift: false,
      phone_number: phone || null,
      initial_order: true,
      purchasing_visitor_id: null,
      status: 'paid',
      email,
      promo_used: null,
      sample_note: null,
      order_type: subscriptionId,
      intended_type: 'subscription',
    }, { onConflict: 'order_id' })
    .select('order_id')
    .single();

  if (error) throw error;
  if (!data) throw new Error(`Unable to save shipment order for Scrip Checkout Session ${session.id}`);
  return data.order_id as string;
}
