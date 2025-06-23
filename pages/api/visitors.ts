import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitor_uuid } = req.body;

    if (!visitor_uuid) {
      return res.status(400).json({ error: 'visitor_uuid is required' });
    }

    // Create new anonymous visitor record
    console.log('📥 Inserting new visitor into database:', visitor_uuid);
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('visitors')
      .insert({
        id: visitor_uuid,
        name: null,
        email: null,
        phone: null,
        cart: {},
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create visitor:', error);
      return res.status(500).json({ error: 'Failed to create visitor record' });
    }

    res.status(201).json({ success: true, visitor: data });
  } catch (error: any) {
    console.error('Visitor creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 