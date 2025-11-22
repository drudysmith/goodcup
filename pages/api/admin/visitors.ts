import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import { verifyAdminAuth } from './auth/verify';

interface Visitor {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cart: any;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  user_id: string | null;
  stripe_cust_id: string | null;
}

interface VisitorsResponse {
  visitors: Visitor[];
  total: number;
  page: number;
  pageSize: number;
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
        has_account,
        has_email,
        has_cart,
        created_at_start,
        created_at_end,
        search,
        page = '1',
        limit = '50'
      } = req.query;

      let query = supabaseServiceRole
        .from('visitors')
        .select('*', { count: 'exact' });

      // Apply filters (simplified for debugging)
      if (has_account !== undefined && has_account !== 'all') {
        if (has_account === 'true') {
          query = query.not('user_id', 'is', null);
        } else {
          query = query.is('user_id', null);
        }
      }

      if (has_email !== undefined && has_email !== 'all') {
        if (has_email === 'true') {
          query = query.not('email', 'is', null);
        } else {
          query = query.is('email', null);
        }
      }

      // Search across name, email, and ID
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      query = query
        .order('id', { ascending: false })
        .range(offset, offset + limitNum - 1);

      console.log('🔍 Admin visitors query filters:', { has_account, has_email, has_cart, search, page, limit });
      
      const { data: visitors, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching visitors:', error);
        return res.status(500).json({ error: 'Failed to fetch visitors' });
      }

      console.log('✅ Visitors fetched:', { count, visitorsLength: visitors?.length });

      const response: VisitorsResponse = {
        visitors: visitors || [],
        total: count || 0,
        page: pageNum,
        pageSize: limitNum
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in visitors API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { visitor_id, ...updateData } = req.body;

      if (!visitor_id) {
        return res.status(400).json({ error: 'visitor_id is required' });
      }

      // Only allow updating specific fields for safety
      const allowedFields = ['name', 'email', 'phone', 'street', 'unit', 'city', 'state', 'postal_code', 'country'];
      const updatePayload: any = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updatePayload[key] = updateData[key];
        }
      });

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { error } = await supabaseServiceRole
        .from('visitors')
        .update(updatePayload)
        .eq('id', visitor_id);

      if (error) {
        console.error('Error updating visitor:', error);
        return res.status(500).json({ error: 'Failed to update visitor' });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating visitor:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
