import type { NextApiRequest, NextApiResponse } from 'next';
import { getScripOfferExpiration } from '../../../lib/server/scripMarketOffer';
import { getScripShipmentOrderId } from '../../../lib/server/scripShipmentOrder';
import { getScripStripe } from '../../../lib/server/scripStripe';
import { supabaseServiceRole } from '../../../lib/supabaseClient';

const STAFF_REDEMPTION_CODE = '013';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  const staffCode = typeof req.body?.staffCode === 'string' ? req.body.staffCode.trim() : '';
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid confirmation link' });
  }
  if (staffCode !== STAFF_REDEMPTION_CODE) {
    return res.status(403).json({ error: 'Incorrect staff code' });
  }

  try {
    const stripe = getScripStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status);
    if (session.metadata?.scrip_campaign !== 'true' || !paid) {
      return res.status(409).json({ error: 'This market offer is not ready to redeem' });
    }

    const orderId = getScripShipmentOrderId(session.id);
    const confirmation = session.metadata.scrip_confirmation || null;
    const { data: currentOrder, error: currentOrderError } = await supabaseServiceRole
      .from('shipment_orders')
      .select('created_at, market_special, special_redeemed')
      .eq('order_id', orderId)
      .maybeSingle();
    if (currentOrderError) throw currentOrderError;
    if (!currentOrder || !confirmation) {
      return res.status(409).json({ error: 'The paid order is still syncing. Please try again in a moment.' });
    }

    let storedConfirmation = currentOrder.market_special;
    if (!storedConfirmation) {
      const { data: backfilledOrder, error: backfillError } = await supabaseServiceRole
        .from('shipment_orders')
        .update({ market_special: confirmation })
        .eq('order_id', orderId)
        .is('market_special', null)
        .select('market_special')
        .maybeSingle();
      if (backfillError) throw backfillError;
      storedConfirmation = backfilledOrder?.market_special || null;
    }
    if (storedConfirmation !== confirmation) {
      return res.status(409).json({ error: 'This confirmation does not match the paid order' });
    }

    const expiresAt = getScripOfferExpiration(currentOrder.created_at);
    if (Date.now() >= new Date(expiresAt).getTime()) {
      return res.status(410).json({ error: 'This market offer has expired', expiresAt });
    }
    if (currentOrder.special_redeemed === true) {
      return res.status(200).json({ specialRedeemed: true, expiresAt });
    }

    const { data: redeemedOrder, error: redeemError } = await supabaseServiceRole
      .from('shipment_orders')
      .update({ special_redeemed: true })
      .eq('order_id', orderId)
      .eq('market_special', confirmation)
      .eq('special_redeemed', false)
      .select('special_redeemed')
      .maybeSingle();
    if (redeemError) throw redeemError;
    if (!redeemedOrder) {
      const { data: latestOrder, error: latestOrderError } = await supabaseServiceRole
        .from('shipment_orders')
        .select('special_redeemed')
        .eq('order_id', orderId)
        .maybeSingle();
      if (latestOrderError) throw latestOrderError;
      if (latestOrder?.special_redeemed === true) {
        return res.status(200).json({ specialRedeemed: true, expiresAt });
      }
      return res.status(409).json({ error: 'This market offer could not be redeemed' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ specialRedeemed: true, expiresAt });
  } catch (error) {
    console.error('Unable to redeem /scrip market offer:', error);
    return res.status(500).json({ error: 'Unable to redeem this offer right now. Please try again.' });
  }
}
