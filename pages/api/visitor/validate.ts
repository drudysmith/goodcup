import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';

interface VisitorData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cart: object | null;
}

interface ValidateResponse {
  visitor: VisitorData;
  visitor_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    let decodedToken;
    
    try {
      decodedToken = jwt.verify(token, jwtSecret!) as any;
    } catch (jwtError) {
      console.log('⚠️ JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid JWT' });
    }

    const { visitor_id } = decodedToken;
    
    if (!visitor_id) {
      return res.status(401).json({ error: 'Invalid JWT payload' });
    }

    console.log('🔍 Validating visitor_id with database:', visitor_id);

    // Fetch visitor data from Supabase with RLS
    const { data: visitorData, error } = await supabaseServiceRole
      .from('visitors')
      .select('id, name, email, phone, cart')
      .eq('id', visitor_id)
      .single();

    if (error) {
      console.log('⚠️ Database error fetching visitor:', error);
      return res.status(401).json({ error: 'Visitor not found' });
    }

    if (!visitorData) {
      console.log('⚠️ No visitor found for ID:', visitor_id);
      return res.status(401).json({ error: 'Visitor not found' });
    }

    console.log('✅ Visitor data fetched successfully:', visitor_id);

    const response: ValidateResponse = {
      visitor: visitorData,
      visitor_id
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in visitor/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 