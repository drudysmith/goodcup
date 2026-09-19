import type Stripe from 'stripe';
import { supabaseServiceRole } from '../supabaseClient';

function toIso(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function objectId(value: string | { id?: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id || null;
}

async function resolveCustomerRowId(stripe: Stripe, subscription: Stripe.Subscription) {
  const stripeCustomerId = objectId(subscription.customer);
  if (!stripeCustomerId) throw new Error(`Subscription ${subscription.id} has no Stripe customer`);

  const customer = typeof subscription.customer === 'string'
    ? await stripe.customers.retrieve(stripeCustomerId)
    : subscription.customer;

  if (!customer.deleted && customer.email) {
    const supabaseUserId = subscription.metadata.supabase_user_id || null;
    const { data, error } = await supabaseServiceRole
      .from('customers')
      .upsert({
        stripe_customer_id: stripeCustomerId,
        email: customer.email,
        ...(supabaseUserId ? { supabase_user_id: supabaseUserId } : {}),
        metadata: {
          stripe_metadata: customer.metadata,
        },
      }, { onConflict: 'stripe_customer_id' })
      .select('id')
      .single();

    if (error) throw error;
    return { stripeCustomerId, customerRowId: data.id as string };
  }

  const { data, error } = await supabaseServiceRole
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error) throw error;
  return { stripeCustomerId, customerRowId: data?.id as string | undefined };
}

export async function persistStripeSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  event: Stripe.Event,
) {
  const firstItem = subscription.items.data[0];
  if (!firstItem?.price?.id) {
    throw new Error(`Subscription ${subscription.id} has no price item`);
  }

  const { stripeCustomerId, customerRowId } = await resolveCustomerRowId(stripe, subscription);
  const currentPeriodEnd = Math.max(...subscription.items.data.map((item) => item.current_period_end));
  const currentPeriodStart = Math.min(...subscription.items.data.map((item) => item.current_period_start));

  const { data, error } = await supabaseServiceRole
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      price_id: firstItem.price.id,
      status: subscription.status,
      current_period_end: toIso(currentPeriodEnd),
      user_id: customerRowId || null,
      metadata: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        stripe_event_created: toIso(event.created),
        stripe_customer_id: stripeCustomerId,
        current_period_start: toIso(currentPeriodStart),
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: toIso(subscription.cancel_at),
        canceled_at: toIso(subscription.canceled_at),
        ended_at: toIso(subscription.ended_at),
        latest_invoice_id: objectId(subscription.latest_invoice),
        subscription_metadata: subscription.metadata,
        items: subscription.items.data.map((item) => ({
          id: item.id,
          price_id: item.price.id,
          product_id: objectId(item.price.product),
          quantity: item.quantity || 1,
          current_period_start: toIso(item.current_period_start),
          current_period_end: toIso(item.current_period_end),
        })),
      },
    }, { onConflict: 'stripe_subscription_id' })
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error(`Unable to persist Stripe subscription ${subscription.id}`);
}
