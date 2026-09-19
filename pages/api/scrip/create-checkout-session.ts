import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';
import { getScripStripe, resolveScripProduct } from '../../../lib/server/scripStripe';

type CheckoutBody = {
  productId?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  smsConsent?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function getBaseUrl(req: NextApiRequest) {
  const forwardedProto = clean(req.headers['x-forwarded-proto'], 16).split(',')[0];
  const protocol = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : 'https';
  const host = clean(req.headers['x-forwarded-host'] || req.headers.host, 255).split(',')[0];
  if (!host) throw new Error('Unable to determine the site URL');
  const isTrusted = host === 'goodcup.me' || host === 'www.goodcup.me' || host.endsWith('.goodcup.me') ||
    host.endsWith('.netlify.app') || host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
  if (!isTrusted) throw new Error('Unrecognized checkout host');
  return `${protocol}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as CheckoutBody;
  const productId = clean(body.productId, 64);
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const phone = normalizePhone(clean(body.phone, 30));
  const line1 = clean(body.address?.line1, 160);
  const line2 = clean(body.address?.line2, 160);
  const city = clean(body.address?.city, 100);
  const state = clean(body.address?.state, 100);
  const postalCode = clean(body.address?.postalCode, 24);
  const country = clean(body.address?.country, 2).toUpperCase() || 'US';

  if (!name || !EMAIL_PATTERN.test(email) || !phone || !line1 || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'Please complete your name, phone, email, and shipping address.' });
  }
  if (country !== 'US') {
    return res.status(400).json({ error: 'This market offer currently ships within the United States.' });
  }
  if (body.smsConsent !== true) {
    return res.status(400).json({ error: 'Please agree to the renewal reminder texts for this offer.' });
  }

  try {
    const stripe = getScripStripe();
    const selectedProduct = await resolveScripProduct(productId);
    const baseUrl = getBaseUrl(req);
    const confirmation = `GC-${randomBytes(3).toString('hex').toUpperCase()}`;
    const address: Stripe.AddressParam = {
      line1,
      ...(line2 ? { line2 } : {}),
      city,
      state,
      postal_code: postalCode,
      country,
    };

    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    const customerPayload = {
      name,
      email,
      phone,
      address,
      shipping: { name, phone, address },
      metadata: { scrip_customer: 'true', sms_renewal_consent: 'true' },
    };
    const customer = existingCustomers.data[0]
      ? await stripe.customers.update(existingCustomers.data[0].id, customerPayload as Stripe.CustomerUpdateParams)
      : await stripe.customers.create(customerPayload as Stripe.CustomerCreateParams);

    const metadata = {
      scrip_campaign: 'true',
      scrip_confirmation: confirmation,
      scrip_product_id: selectedProduct.productId,
      scrip_product_name: selectedProduct.name,
      sms_renewal_consent: 'true',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: selectedProduct.priceId, quantity: 1 }],
      success_url: `${baseUrl}/scrip/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/scrip?checkout=canceled`,
      billing_address_collection: 'auto',
      customer_update: { address: 'auto', name: 'auto', shipping: 'auto' },
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: { message: 'No commitment. Cancel anytime. We will text you 7 days before renewal.' },
      },
      integration_identifier: `goodcup_scrip_${randomBytes(4).toString('hex')}`,
    } as Stripe.Checkout.SessionCreateParams);

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Unable to create /scrip Checkout Session:', error);
    return res.status(500).json({ error: 'Secure checkout is temporarily unavailable. Please try again.' });
  }
}
