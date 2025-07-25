import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔍 API: current-banner-promo endpoint called');
  try {
    const promoCodes = await stripe.promotionCodes.list({ active: true, limit: 100 });
    const promo = promoCodes.data.find(
      (p) => p.metadata && p.metadata.banner === 'true'
    );
    if (!promo) {
      return res.status(200).json({ promo: null });
    }
    const coupon = promo.coupon;
    
    // Log the redemption values for debugging
    console.log('🔍 Promo Code Redemption Info:');
    console.log('  Code:', promo.code);
    console.log('  Duration:', coupon.duration);
    console.log('  Duration in Months:', coupon.duration_in_months);
    console.log('  First Time Transaction:', promo.restrictions?.first_time_transaction);
    
    res.status(200).json({
      code: promo.code,
      coupon_id: coupon.id,
      percent_off: coupon.percent_off ?? null,
      amount_off: coupon.amount_off ?? null,
      expires_at: promo.expires_at ? promo.expires_at * 1000 : null,
      duration: coupon.duration ?? null,
      duration_in_months: coupon.duration_in_months ?? null,
      first_time_transaction: promo.restrictions?.first_time_transaction ?? false,
      metadata: {
        copy: promo.metadata?.copy || null,
        ...(promo.metadata || {})
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
} 