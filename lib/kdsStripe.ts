import Stripe from 'stripe';
import { KdsItem } from './kds';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_KDS_LINES = 40;

const positiveInteger = (value: string | undefined) => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const nonnegativeInteger = (value: string | undefined) => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const parseItem = (value: string | undefined): KdsItem | null => {
  if (!value || value.length > 500) return null;
  try {
    const item = JSON.parse(value) as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (
      typeof item.productId !== 'string' || !item.productId.startsWith('prod_') || item.productId.length > 255 ||
      typeof item.priceId !== 'string' || !item.priceId.startsWith('price_') || item.priceId.length > 255 ||
      !name || name.length > 250 ||
      typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 999
    ) return null;

    return {
      productId: item.productId,
      priceId: item.priceId,
      name,
      quantity: item.quantity,
    };
  } catch {
    return null;
  }
};

export type KdsPaymentSnapshot = {
  id: string;
  stripe_payment_intent_id: string;
  source: 'ipad_kiosk';
  payment_status: 'paid';
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  item_count: number;
  items: KdsItem[];
  created_at: string;
  paid_at: string;
};

export const kdsSnapshotFromPaymentIntent = (
  paymentIntent: Stripe.PaymentIntent,
  paidAt: string,
): KdsPaymentSnapshot | null => {
  const metadata = paymentIntent.metadata;
  if (metadata?.kiosk !== 'true') return null;

  const orderId = metadata.kds_order_id;
  const lineCount = positiveInteger(metadata.kds_line_count);
  const itemCount = positiveInteger(metadata.item_count);
  const subtotalAmount = nonnegativeInteger(metadata.subtotal_amount);
  const discountAmount = nonnegativeInteger(metadata.discount_amount);

  if (
    !orderId || !UUID_PATTERN.test(orderId) ||
    !lineCount || lineCount > MAX_KDS_LINES ||
    !itemCount || subtotalAmount === null || discountAmount === null ||
    !Number.isSafeInteger(paymentIntent.amount) || paymentIntent.amount <= 0 ||
    subtotalAmount - discountAmount !== paymentIntent.amount ||
    !/^[a-z]{3}$/.test(paymentIntent.currency)
  ) return null;

  const items: KdsItem[] = [];
  for (let index = 0; index < lineCount; index += 1) {
    const item = parseItem(metadata[`kds_line_${index}`]);
    if (!item) return null;
    items.push(item);
  }
  if (items.reduce((sum, item) => sum + item.quantity, 0) !== itemCount) return null;

  return {
    id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    source: 'ipad_kiosk',
    payment_status: 'paid',
    currency: paymentIntent.currency,
    subtotal_amount: subtotalAmount,
    discount_amount: discountAmount,
    total_amount: paymentIntent.amount,
    item_count: itemCount,
    items,
    created_at: new Date(paymentIntent.created * 1000).toISOString(),
    paid_at: paidAt,
  };
};
