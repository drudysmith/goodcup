import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-07-30.basil',
});

interface StripeOrder {
  id: string;
  stripe_payment_intent_id: string;
  created_at: string;
  amount: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId } = req.query;

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId is required' });
  }

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100
    });

    const orderData: StripeOrder[] = paymentIntents.data.map(intent => ({
      id: intent.id,
      stripe_payment_intent_id: intent.id,
      created_at: new Date(intent.created * 1000).toISOString(),
      amount: intent.amount
    }));

    res.status(200).json(orderData);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 