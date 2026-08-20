import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSupabaseServiceRole } from '../../../lib/supabaseClient';
import { verifyAdminAuth } from './auth/verify';

type ShipmentOrder = {
  order_id: string;
  order_type: string | null;
  intended_type: 'subscription' | 'one_off' | null;
  created_at: string | null;
  status: string;
  fulfilled_at: string | null;
  initial_order: boolean;
  recipient_name: string;
  email: string | null;
  phone_number: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gift: boolean;
  order_info: Array<{ productId?: string; priceId?: string; quantity?: number }> | null;
  purchasing_visitor_id: string | null;
  sample_note: string | null;
};

type Visitor = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  stripe_cust_id: string | null;
};

type Contact = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

type Address = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type ProductSummary = { name: string; quantity: number };

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
]);

const ATTENTION_STATUSES = new Set(['past_due', 'unpaid', 'incomplete', 'pending', 'unpaid']);

const chunk = <T,>(items: T[], size = 100): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};

const toIso = (unixTime: number | null | undefined) =>
  unixTime ? new Date(unixTime * 1000).toISOString() : null;

const stripeCustomerContact = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Contact & { address: Address | null; id: string | null } => {
  if (!customer) return { id: null, name: null, email: null, phone: null, address: null };
  if (typeof customer === 'string' || customer.deleted) {
    return { id: typeof customer === 'string' ? customer : customer.id, name: null, email: null, phone: null, address: null };
  }
  return {
    id: customer.id,
    name: customer.name || null,
    email: customer.email || null,
    phone: customer.phone || null,
    address: customer.address ? {
      line1: customer.address.line1 || null,
      line2: customer.address.line2 || null,
      city: customer.address.city || null,
      state: customer.address.state || null,
      postalCode: customer.address.postal_code || null,
      country: customer.address.country || null,
    } : null,
  };
};

const shipmentAddress = (shipment: ShipmentOrder | null): Address | null => shipment ? ({
  line1: shipment.address_line1 || null,
  line2: shipment.address_line2 || null,
  city: shipment.city || null,
  state: shipment.state || null,
  postalCode: shipment.postal_code || null,
  country: shipment.country || null,
}) : null;

const sessionContact = (session: Stripe.Checkout.Session) => {
  const value = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    collected_information?: { shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null } | null;
  };
  const shipping = value.collected_information?.shipping_details || value.shipping_details || null;
  const details = session.customer_details;
  const rawAddress = shipping?.address || details?.address || null;
  return {
    name: shipping?.name || details?.name || null,
    email: details?.email || session.customer_email || null,
    phone: details?.phone || null,
    address: rawAddress ? {
      line1: rawAddress.line1 || null,
      line2: rawAddress.line2 || null,
      city: rawAddress.city || null,
      state: rawAddress.state || null,
      postalCode: rawAddress.postal_code || null,
      country: rawAddress.country || null,
    } : null,
  };
};

const productIdFromPrice = (price: Stripe.Price | null | undefined) => {
  if (!price?.product) return null;
  return typeof price.product === 'string' ? price.product : price.product.id;
};

const productIdFromSubscriptionItem = (item: Stripe.SubscriptionItem) => productIdFromPrice(item.price);

const listAllSubscriptions = async (stripe: Stripe) => {
  const rows: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });
    rows.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return rows;
};

const listAllCheckoutSessions = async (stripe: Stripe) => {
  const rows: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer', 'data.payment_intent', 'data.line_items'],
    });
    rows.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return rows;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { isAdmin, error: authError } = await verifyAdminAuth(req);
  if (!isAdmin) return res.status(401).json({ error: authError || 'Admin access required' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Live Stripe and Supabase data are not configured for this environment' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
    const supabase = getSupabaseServiceRole();

    const [{ data: shipmentData, error: shipmentError }, subscriptions, sessions] = await Promise.all([
      supabase
        .from('shipment_orders')
        .select('order_id, order_type, intended_type, created_at, status, fulfilled_at, initial_order, recipient_name, email, phone_number, address_line1, address_line2, city, state, postal_code, country, gift, order_info, purchasing_visitor_id, sample_note')
        .order('created_at', { ascending: false }),
      listAllSubscriptions(stripe),
      listAllCheckoutSessions(stripe),
    ]);

    if (shipmentError) throw shipmentError;
    const shipments = (shipmentData || []) as ShipmentOrder[];

    const visitorIds = [...new Set(shipments.map((order) => order.purchasing_visitor_id).filter(Boolean))] as string[];
    const visitors: Visitor[] = [];
    for (const ids of chunk(visitorIds)) {
      const { data, error } = await supabase.from('visitors').select('id, name, email, phone, stripe_cust_id').in('id', ids);
      if (error) throw error;
      visitors.push(...((data || []) as Visitor[]));
    }

    const productIds = new Set<string>();
    subscriptions.forEach((subscription) => subscription.items.data.forEach((item) => {
      const productId = productIdFromSubscriptionItem(item);
      if (productId) productIds.add(productId);
    }));
    sessions.forEach((session) => session.line_items?.data.forEach((item) => {
      const productId = productIdFromPrice(item.price || undefined);
      if (productId) productIds.add(productId);
    }));
    shipments.forEach((shipment) => shipment.order_info?.forEach((item) => {
      if (item.productId) productIds.add(item.productId);
    }));

    const productEntries = await Promise.all([...productIds].map(async (productId) => {
      try {
        const product = await stripe.products.retrieve(productId);
        return [productId, product.deleted ? 'Archived product' : product.name] as const;
      } catch {
        return [productId, 'Unknown product'] as const;
      }
    }));
    const productNames = new Map(productEntries);
    const visitorById = new Map(visitors.map((visitor) => [visitor.id, visitor]));
    const shipmentByOrderType = new Map(shipments.filter((row) => row.order_type).map((row) => [row.order_type as string, row]));
    const shipmentById = new Map(shipments.map((row) => [row.order_id, row]));
    const usedShipmentIds = new Set<string>();

    const sessionBySubscriptionId = new Map<string, Stripe.Checkout.Session>();
    sessions.forEach((session) => {
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (subscriptionId && !sessionBySubscriptionId.has(subscriptionId)) sessionBySubscriptionId.set(subscriptionId, session);
    });

    const productsFromShipment = (shipment: ShipmentOrder | null): ProductSummary[] =>
      (shipment?.order_info || []).map((item) => ({
        name: item.productId ? productNames.get(item.productId) || 'Unknown product' : item.priceId || 'Order item',
        quantity: item.quantity || 1,
      }));

    const rows: any[] = subscriptions.map((subscription) => {
      const checkoutSession = sessionBySubscriptionId.get(subscription.id) || null;
      const metadataOrderId = checkoutSession?.metadata?.order_id || null;
      const shipment = shipmentByOrderType.get(subscription.id) || (metadataOrderId ? shipmentById.get(metadataOrderId) : null) || null;
      if (shipment) usedShipmentIds.add(shipment.order_id);
      const visitor = shipment?.purchasing_visitor_id ? visitorById.get(shipment.purchasing_visitor_id) || null : null;
      const customer = stripeCustomerContact(subscription.customer);
      const firstItem = subscription.items.data[0];
      const products = subscription.items.data.map((item) => ({
        name: productIdFromSubscriptionItem(item) ? productNames.get(productIdFromSubscriptionItem(item) as string) || 'Unknown product' : 'Subscription product',
        quantity: item.quantity || 1,
      }));
      const address = shipmentAddress(shipment) || customer.address;
      const warnings = [];
      if (!shipment) warnings.push('Stripe subscription has no matching Supabase shipment order');
      if (!address?.line1 || !address.city || !address.state || !address.postalCode) warnings.push('Shipping address is incomplete');
      if (ATTENTION_STATUSES.has(subscription.status)) warnings.push(`Subscription is ${subscription.status.replaceAll('_', ' ')}`);
      if (shipment && shipment.status !== 'paid' && shipment.status !== 'fulfilled') warnings.push(`Payment is not confirmed in the shipment record (${shipment.status || 'pending'})`);
      if (subscription.cancel_at_period_end) warnings.push('Subscription is scheduled to cancel');

      return {
        id: `subscription:${subscription.id}`,
        kind: 'subscription',
        stripeId: subscription.id,
        stripeCustomerId: customer.id,
        stripeUrl: `https://dashboard.stripe.com/subscriptions/${subscription.id}`,
        status: subscription.status,
        active: ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
        createdAt: toIso(subscription.created),
        renewalAt: toIso(firstItem?.current_period_end),
        endedAt: toIso(subscription.ended_at || subscription.canceled_at),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: subscription.items.data.reduce((total, item) => total + (item.price.unit_amount || 0) * (item.quantity || 1), 0),
        currency: firstItem?.price.currency || subscription.currency,
        billingInterval: firstItem?.price.recurring?.interval || null,
        billingIntervalCount: firstItem?.price.recurring?.interval_count || null,
        products,
        recipient: {
          name: shipment?.recipient_name || customer.name || 'No recipient on file',
          email: shipment?.email || customer.email,
          phone: shipment?.phone_number || customer.phone,
          address,
        },
        purchaser: visitor ? { name: visitor.name, email: visitor.email, phone: visitor.phone } : { name: customer.name, email: customer.email, phone: customer.phone },
        gift: shipment?.gift || false,
        matchStatus: shipment ? 'matched' : 'stripe_only',
        shipmentOrderId: shipment?.order_id || null,
        shipmentStatus: shipment?.status || null,
        fulfilledAt: shipment?.fulfilled_at || null,
        sampleNote: shipment?.sample_note || null,
        warnings,
      };
    });

    // A Checkout Session is not an order until payment completes. Abandoned or
    // expired sessions remain represented by their pending Supabase row instead.
    sessions.filter((session) => session.mode === 'payment' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')).forEach((session) => {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
      const metadataOrderId = session.metadata?.order_id || null;
      const shipment = (paymentIntentId ? shipmentByOrderType.get(paymentIntentId) : null) || (metadataOrderId ? shipmentById.get(metadataOrderId) : null) || null;
      if (shipment) usedShipmentIds.add(shipment.order_id);
      const visitor = shipment?.purchasing_visitor_id ? visitorById.get(shipment.purchasing_visitor_id) || null : null;
      const customer = stripeCustomerContact(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
      const fallback = sessionContact(session);
      const address = shipmentAddress(shipment) || fallback.address || customer.address;
      const sessionProducts = (session.line_items?.data || []).map((item) => {
        const productId = productIdFromPrice(item.price || undefined);
        return { name: productId ? productNames.get(productId) || item.description || 'Unknown product' : item.description || 'Order item', quantity: item.quantity || 1 };
      });
      const products = sessionProducts.length ? sessionProducts : productsFromShipment(shipment);
      const status = session.payment_status === 'paid' ? 'paid' : session.status || session.payment_status;
      const warnings = [];
      if (!shipment) warnings.push('Stripe payment has no matching Supabase shipment order');
      if (!address?.line1 || !address.city || !address.state || !address.postalCode) warnings.push('Shipping address is incomplete');
      if (status !== 'paid' && status !== 'complete') warnings.push(`Payment is ${status.replaceAll('_', ' ')}`);
      if (shipment && shipment.status !== 'paid' && shipment.status !== 'fulfilled') warnings.push(`Payment is not confirmed in the shipment record (${shipment.status || 'pending'})`);

      rows.push({
        id: `one_off:${session.id}`,
        kind: 'one_off',
        stripeId: paymentIntentId || session.id,
        stripeCustomerId: customer.id,
        stripeUrl: paymentIntentId ? `https://dashboard.stripe.com/payments/${paymentIntentId}` : `https://dashboard.stripe.com/test/payments`,
        status,
        active: false,
        createdAt: toIso(session.created),
        renewalAt: null,
        endedAt: null,
        cancelAtPeriodEnd: false,
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        billingInterval: null,
        billingIntervalCount: null,
        products,
        recipient: {
          name: shipment?.recipient_name || fallback.name || customer.name || 'No recipient on file',
          email: shipment?.email || fallback.email || customer.email,
          phone: shipment?.phone_number || fallback.phone || customer.phone,
          address,
        },
        purchaser: visitor ? { name: visitor.name, email: visitor.email, phone: visitor.phone } : { name: customer.name || fallback.name, email: customer.email || fallback.email, phone: customer.phone || fallback.phone },
        gift: shipment?.gift || false,
        matchStatus: shipment ? 'matched' : 'stripe_only',
        shipmentOrderId: shipment?.order_id || null,
        shipmentStatus: shipment?.status || null,
        fulfilledAt: shipment?.fulfilled_at || null,
        sampleNote: shipment?.sample_note || null,
        warnings,
      });
    });

    shipments.filter((shipment) => !usedShipmentIds.has(shipment.order_id)).forEach((shipment) => {
      const visitor = shipment.purchasing_visitor_id ? visitorById.get(shipment.purchasing_visitor_id) || null : null;
      const warnings = ['Supabase shipment order has no matching Stripe record'];
      const address = shipmentAddress(shipment);
      if (!address?.line1 || !address.city || !address.state || !address.postalCode) warnings.push('Shipping address is incomplete');
      if (shipment.status !== 'paid' && shipment.status !== 'fulfilled') warnings.push(`Payment is not confirmed in the shipment record (${shipment.status || 'pending'})`);
      rows.push({
        id: `supabase:${shipment.order_id}`,
        kind: shipment.intended_type || 'unknown',
        stripeId: shipment.order_type,
        stripeCustomerId: visitor?.stripe_cust_id || null,
        stripeUrl: null,
        status: shipment.status || 'pending',
        active: false,
        createdAt: shipment.created_at,
        renewalAt: null,
        endedAt: null,
        cancelAtPeriodEnd: false,
        amount: null,
        currency: 'usd',
        billingInterval: null,
        billingIntervalCount: null,
        products: productsFromShipment(shipment),
        recipient: { name: shipment.recipient_name || 'No recipient on file', email: shipment.email, phone: shipment.phone_number, address },
        purchaser: visitor ? { name: visitor.name, email: visitor.email, phone: visitor.phone } : null,
        gift: shipment.gift,
        matchStatus: 'supabase_only',
        shipmentOrderId: shipment.order_id,
        shipmentStatus: shipment.status,
        fulfilledAt: shipment.fulfilled_at,
        sampleNote: shipment.sample_note,
        warnings,
      });
    });

    rows.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const now = Date.now();
    const inThirtyDays = now + 30 * 24 * 60 * 60 * 1000;
    const stats = {
      total: rows.length,
      subscriptions: rows.filter((row) => row.kind === 'subscription').length,
      activeSubscriptions: rows.filter((row) => row.kind === 'subscription' && row.active).length,
      oneOffs: rows.filter((row) => row.kind === 'one_off').length,
      dueNext30Days: rows.filter((row) => row.active && !row.cancelAtPeriodEnd && row.renewalAt && new Date(row.renewalAt).getTime() >= now && new Date(row.renewalAt).getTime() <= inThirtyDays).length,
      attention: rows.filter((row) => row.warnings.length > 0).length,
      unmatched: rows.filter((row) => row.matchStatus !== 'matched').length,
      pendingShipments: rows.filter((row) => row.shipmentStatus === 'pending').length,
    };

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ orders: rows, stats, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to build admin order center:', error);
    return res.status(500).json({ error: 'Unable to load the combined Stripe and Supabase order data' });
  }
}
