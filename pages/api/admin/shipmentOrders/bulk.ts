import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../../../lib/supabaseClient';
import { verifyAdminAuth } from '../auth/verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check admin authentication
  const { isAdmin, error: authError } = await verifyAdminAuth(req);
  if (!isAdmin) {
    return res.status(401).json({ error: authError || 'Admin access required' });
  }

  if (req.method === 'PATCH') {
    try {
      const { order_ids, fulfilled_at } = req.body;

      if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({ error: 'order_ids array is required' });
      }

      console.log('🔄 Bulk updating orders:', { order_ids: order_ids.length, fulfilled_at });

      const { error } = await supabaseServiceRole
        .from('shipment_orders')
        .update({ fulfilled_at })
        .in('order_id', order_ids);

      if (error) {
        console.error('❌ Error bulk updating shipment orders:', error);
        return res.status(500).json({ error: 'Failed to bulk update shipment orders' });
      }

      console.log('✅ Successfully bulk updated orders:', order_ids.length);
      res.status(200).json({ 
        success: true, 
        updated_count: order_ids.length 
      });
    } catch (error) {
      console.error('❌ Error in bulk update API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
