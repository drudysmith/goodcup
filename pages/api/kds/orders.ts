import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAuth } from '../admin/auth/verify';
import { getSupabaseServiceRole } from '../../../lib/supabaseClient';
import { isKdsStatus, KdsItem, KdsOrder, KdsStatus } from '../../../lib/kds';

type KdsOrderRow = {
  id: string;
  stripe_payment_intent_id: string;
  status: KdsStatus;
  currency: string;
  total_amount: number;
  item_count: number;
  items: KdsItem[];
  created_at: string;
  paid_at: string;
  status_updated_at: string;
};

const toOrder = (row: KdsOrderRow): KdsOrder => ({
  id: row.id,
  stripePaymentIntentId: row.stripe_payment_intent_id,
  status: row.status,
  currency: row.currency,
  totalAmount: row.total_amount,
  itemCount: row.item_count,
  items: row.items,
  createdAt: row.created_at,
  paidAt: row.paid_at,
  statusUpdatedAt: row.status_updated_at,
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_COLUMNS = 'id, stripe_payment_intent_id, status, currency, total_amount, item_count, items, created_at, paid_at, status_updated_at';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdminAuth(req);
  if (!auth.isAdmin) return res.status(401).json({ error: auth.error || 'Admin access required' });

  const supabase = getSupabaseServiceRole();

  if (req.method === 'GET') {
    const [activeResult, completedResult] = await Promise.all([
      supabase
        .from('kds_orders')
        .select(ORDER_COLUMNS)
        .eq('source', 'ipad_kiosk')
        .eq('payment_status', 'paid')
        .in('status', ['new', 'making', 'ready'])
        .order('paid_at', { ascending: true })
        .limit(200),
      supabase
        .from('kds_orders')
        .select(ORDER_COLUMNS)
        .eq('source', 'ipad_kiosk')
        .eq('payment_status', 'paid')
        .eq('status', 'done')
        .order('status_updated_at', { ascending: false })
        .limit(20),
    ]);

    if (activeResult.error || completedResult.error) {
      console.error('Unable to load KDS orders:', activeResult.error || completedResult.error);
      return res.status(500).json({ error: 'Unable to load kiosk orders' });
    }

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({
      activeOrders: ((activeResult.data || []) as KdsOrderRow[]).map(toOrder),
      completedOrders: ((completedResult.data || []) as KdsOrderRow[]).map(toOrder),
      generatedAt: new Date().toISOString(),
    });
  }

  if (req.method === 'PATCH') {
    const { orderId, status } = req.body || {};
    if (typeof orderId !== 'string' || !UUID_PATTERN.test(orderId) || !isKdsStatus(status)) {
      return res.status(400).json({ error: 'A valid kiosk order and status are required' });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('kds_orders')
      .update({
        status,
        status_updated_at: now,
        status_updated_by: auth.admin?.email || null,
      })
      .eq('id', orderId)
      .eq('source', 'ipad_kiosk')
      .eq('payment_status', 'paid')
      .select(ORDER_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error('Unable to update KDS status:', error);
      return res.status(500).json({ error: 'Unable to update this order' });
    }
    if (!data) return res.status(404).json({ error: 'Paid kiosk order not found' });

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ order: toOrder(data as KdsOrderRow) });
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}
