import type { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';
import { getScripStripe } from '../../../lib/server/scripStripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid confirmation link' });
  }

  try {
    const stripe = getScripStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product', 'subscription.latest_invoice', 'customer'],
    });

    if (session.metadata?.scrip_campaign !== 'true') {
      return res.status(404).json({ error: 'Confirmation not found' });
    }

    const customer = typeof session.customer === 'object' && session.customer && !session.customer.deleted
      ? session.customer
      : null;
    const lineItem = session.line_items?.data[0];
    const price = lineItem?.price && typeof lineItem.price === 'object' ? lineItem.price : null;
    const product = price?.product && typeof price.product === 'object' && !price.product.deleted
      ? price.product
      : null;
    const subscription = typeof session.subscription === 'object' ? session.subscription : null;
    const invoice = subscription?.latest_invoice && typeof subscription.latest_invoice === 'object'
      ? subscription.latest_invoice as Stripe.Invoice
      : null;
    const paid = session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status);

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      paid,
      customerName: customer?.name || session.customer_details?.name || 'Goodcup customer',
      productName: product?.name || session.metadata.scrip_product_name || lineItem?.description || 'Goodcup subscription',
      confirmation: session.metadata.scrip_confirmation || session.id.slice(-8).toUpperCase(),
      completedAt: new Date(session.created * 1000).toISOString(),
      receiptUrl: invoice?.hosted_invoice_url || null,
    });
  } catch (error) {
    console.error('Unable to verify /scrip Checkout Session:', error);
    return res.status(404).json({ error: 'We could not verify this confirmation yet. Please refresh in a moment.' });
  }
}
