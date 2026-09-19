import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyScripManageToken } from '../../../lib/server/scripLinks';
import { getScripStripe } from '../../../lib/server/scripStripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const payload = verifyScripManageToken(token);
    const stripe = getScripStripe();
    const subscription = await stripe.subscriptions.retrieve(payload.subscriptionId);
    const subscriptionCustomer = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
    if (subscriptionCustomer !== payload.customerId || subscription.metadata.scrip_campaign !== 'true') {
      throw new Error('Invalid subscription link');
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: payload.customerId,
      return_url: 'https://goodcup.me/scrip',
      flow_data: {
        type: 'subscription_cancel',
        subscription_cancel: { subscription: payload.subscriptionId },
        after_completion: {
          type: 'redirect',
          redirect: { return_url: 'https://goodcup.me/scrip?subscription=updated' },
        },
      },
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.redirect(303, portal.url);
  } catch (error) {
    console.error('Unable to open the /scrip management link:', error);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(400).send('This Goodcup subscription link is invalid or has expired. Please contact hello@goodcup.me for help.');
  }
}
