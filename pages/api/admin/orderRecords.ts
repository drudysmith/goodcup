import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSupabaseServiceRole } from '../../../lib/supabaseClient';
import { verifyAdminAuth } from './auth/verify';

const validOrderKey = (value: unknown): value is string =>
  typeof value === 'string' && /^(subscription|one_off|supabase):[^\s]{1,220}$/.test(value);

const stripeRecordExists = async (stripe: Stripe, stripeId: string) => {
  try {
    if (stripeId.startsWith('sub_')) await stripe.subscriptions.retrieve(stripeId);
    else if (stripeId.startsWith('pi_')) await stripe.paymentIntents.retrieve(stripeId);
    else if (stripeId.startsWith('cs_')) await stripe.checkout.sessions.retrieve(stripeId);
    else return true;
    return true;
  } catch (error) {
    const stripeError = error as { code?: string; statusCode?: number };
    if (stripeError.code === 'resource_missing' || stripeError.statusCode === 404) return false;
    throw error;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdminAuth(req);
  if (!auth.isAdmin) return res.status(401).json({ error: auth.error || 'Admin access required' });

  const supabase = getSupabaseServiceRole();

  if (req.method === 'PATCH') {
    const { orderKey, archived } = req.body || {};
    if (!validOrderKey(orderKey) || typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'A valid order key and archived state are required' });
    }

    if (archived) {
      const { error } = await supabase.from('admin_order_archives').upsert({
        order_key: orderKey,
        archived_at: new Date().toISOString(),
        archived_by: auth.admin?.email || null,
      }, { onConflict: 'order_key' });
      if (error) {
        console.error('Unable to archive admin order:', error);
        return res.status(500).json({ error: 'Unable to archive this entry' });
      }
    } else {
      const { error } = await supabase.from('admin_order_archives').delete().eq('order_key', orderKey);
      if (error) {
        console.error('Unable to restore admin order:', error);
        return res.status(500).json({ error: 'Unable to restore this entry' });
      }
    }

    return res.status(200).json({ success: true, archived });
  }

  if (req.method === 'DELETE') {
    const { orderKey, shipmentOrderId, confirmation } = req.body || {};
    if (!validOrderKey(orderKey) || !orderKey.startsWith('supabase:') || typeof shipmentOrderId !== 'string') {
      return res.status(400).json({ error: 'Only Supabase-only shipment entries can be deleted here' });
    }
    if (orderKey !== `supabase:${shipmentOrderId}` || confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Deletion confirmation did not match the selected entry' });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipment_orders')
      .select('order_id, order_type')
      .eq('order_id', shipmentOrderId)
      .maybeSingle();

    if (shipmentError) {
      console.error('Unable to verify shipment before deletion:', shipmentError);
      return res.status(500).json({ error: 'Unable to verify this shipment entry' });
    }
    if (!shipment) return res.status(404).json({ error: 'Shipment entry not found' });

    if (shipment.order_type) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ error: 'Stripe verification is unavailable; deletion was blocked' });
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
      if (await stripeRecordExists(stripe, shipment.order_type)) {
        return res.status(409).json({ error: 'This entry still points to a Stripe record and cannot be deleted' });
      }
    }

    const { data: deleted, error: deleteError } = await supabase
      .from('shipment_orders')
      .delete()
      .eq('order_id', shipmentOrderId)
      .select('order_id')
      .maybeSingle();

    if (deleteError) {
      console.error('Unable to delete shipment entry:', deleteError);
      return res.status(500).json({ error: 'Unable to delete this Supabase entry' });
    }
    if (!deleted) return res.status(404).json({ error: 'Shipment entry was not deleted' });

    await supabase.from('admin_order_archives').delete().eq('order_key', orderKey);
    return res.status(200).json({ success: true, deletedOrderId: shipmentOrderId });
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
