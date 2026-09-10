import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { getSupabaseServiceRole } from '../../../lib/supabaseClient';
import { KdsItem } from '../../../lib/kds';

type RegistrationBody = {
  orderId?: unknown;
  paymentIntentId?: unknown;
  currency?: unknown;
  subtotalAmount?: unknown;
  discountAmount?: unknown;
  totalAmount?: unknown;
  itemCount?: unknown;
  items?: unknown;
  createdAt?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const secretMatches = (provided: string | undefined, expected: string | undefined) => {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isNonnegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const parseItems = (value: unknown): KdsItem[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const items: KdsItem[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') return null;
    const item = candidate as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (
      typeof item.productId !== 'string' || !item.productId.startsWith('prod_') || item.productId.length > 255 ||
      typeof item.priceId !== 'string' || !item.priceId.startsWith('price_') || item.priceId.length > 255 ||
      !name || name.length > 250 || !isPositiveInteger(item.quantity) || item.quantity > 999
    ) return null;
    items.push({ productId: item.productId, priceId: item.priceId, name, quantity: item.quantity });
  }
  return items;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const providedSecret = req.headers['x-goodcup-kds-secret'];
  if (Array.isArray(providedSecret) || !secretMatches(providedSecret, process.env.KDS_INGEST_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized kiosk backend' });
  }

  const body = (req.body || {}) as RegistrationBody;
  const items = parseItems(body.items);
  const itemCount = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const createdAt = typeof body.createdAt === 'string' && Number.isFinite(Date.parse(body.createdAt))
    ? new Date(body.createdAt).toISOString()
    : null;

  if (
    typeof body.orderId !== 'string' || !UUID_PATTERN.test(body.orderId) ||
    typeof body.paymentIntentId !== 'string' || !/^pi_[A-Za-z0-9_]+$/.test(body.paymentIntentId) || body.paymentIntentId.length > 255 ||
    typeof body.currency !== 'string' || !/^[a-z]{3}$/.test(body.currency) ||
    !isNonnegativeInteger(body.subtotalAmount) || !isNonnegativeInteger(body.discountAmount) ||
    !isPositiveInteger(body.totalAmount) || !isPositiveInteger(body.itemCount) ||
    !items || body.itemCount !== itemCount || body.subtotalAmount - body.discountAmount !== body.totalAmount ||
    !createdAt
  ) {
    return res.status(400).json({ error: 'Invalid kiosk order registration' });
  }

  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('kds_orders')
    .upsert({
      id: body.orderId,
      stripe_payment_intent_id: body.paymentIntentId,
      source: 'ipad_kiosk',
      payment_status: 'awaiting_payment',
      status: 'new',
      currency: body.currency,
      subtotal_amount: body.subtotalAmount,
      discount_amount: body.discountAmount,
      total_amount: body.totalAmount,
      item_count: body.itemCount,
      items,
      created_at: createdAt,
      status_updated_at: createdAt,
    }, { onConflict: 'id', ignoreDuplicates: true })
    .select('id, stripe_payment_intent_id')
    .maybeSingle();

  if (error) {
    console.error('Unable to register KDS order:', error);
    return res.status(500).json({ error: 'Unable to register kiosk order' });
  }

  if (!data) {
    const { data: existing, error: existingError } = await supabase
      .from('kds_orders')
      .select('id, stripe_payment_intent_id')
      .eq('id', body.orderId)
      .maybeSingle();
    if (existingError || !existing || existing.stripe_payment_intent_id !== body.paymentIntentId) {
      return res.status(409).json({ error: 'Kiosk order reference is already in use' });
    }
  }

  return res.status(200).json({ registered: true, orderId: body.orderId });
}
