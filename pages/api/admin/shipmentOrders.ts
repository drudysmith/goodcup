import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import { verifyAdminAuth } from './auth/verify';

interface ShipmentOrder {
  order_id: string;
  order_type: string | null;
  created_at: string | null;
  intended_type: string | null;
  initial_order: boolean;
  status: string;
  recipient_name: string;
  phone_number: string | null;
  order_info: any;
  email: string | null;
  sample_note: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gift: boolean;
  fulfilled_at: string | null;
}

interface ShipmentOrdersResponse {
  orders: ShipmentOrder[];
  total: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check admin authentication
  const { isAdmin, error: authError } = await verifyAdminAuth(req);
  if (!isAdmin) {
    return res.status(401).json({ error: authError || 'Admin access required' });
  }

  if (req.method === 'GET') {
    try {
      const {
        order_type,
        created_at_start,
        created_at_end,
        intended_type,
        initial_order,
        status,
        page = '1',
        limit = '50'
      } = req.query;

      let query = supabaseServiceRole
        .from('shipment_orders')
        .select('*', { count: 'exact' });

      // Apply filters
      if (order_type && order_type !== 'all') {
        query = query.eq('order_type', order_type);
      }

      if (created_at_start) {
        query = query.gte('created_at', created_at_start);
      }

      if (created_at_end) {
        query = query.lte('created_at', created_at_end);
      }

      if (intended_type && intended_type !== 'all') {
        query = query.eq('intended_type', intended_type);
      }

      if (initial_order !== undefined && initial_order !== 'all') {
        query = query.eq('initial_order', initial_order === 'true');
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      const { data: orders, error, count } = await query;

      if (error) {
        console.error('Error fetching shipment orders:', error);
        return res.status(500).json({ error: 'Failed to fetch shipment orders' });
      }

      const response: ShipmentOrdersResponse = {
        orders: orders || [],
        total: count || 0
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in shipment orders API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { order_id, fulfilled_at } = req.body;

      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      if (fulfilled_at === undefined) {
        return res.status(400).json({ error: 'fulfilled_at is required' });
      }

      if (fulfilled_at !== null && (typeof fulfilled_at !== 'string' || Number.isNaN(Date.parse(fulfilled_at)))) {
        return res.status(400).json({ error: 'fulfilled_at must be a valid date or null' });
      }

      const { data: updatedOrder, error } = await supabaseServiceRole
        .from('shipment_orders')
        .update({ fulfilled_at })
        .eq('order_id', order_id)
        .select('order_id, fulfilled_at')
        .maybeSingle();

      if (error) {
        console.error('Error updating shipment order:', error);
        return res.status(500).json({ error: 'Failed to update shipment order' });
      }

      if (!updatedOrder) {
        return res.status(404).json({ error: 'Shipment order not found' });
      }

      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error('Error updating shipment order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
