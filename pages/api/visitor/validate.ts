import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import { LOG_ENABLED } from '../../../lib/utils/log';

interface VisitorData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cart: object | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  has_account?: boolean;
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
      if (LOG_ENABLED) {
        console.log('⚠️ Bug 10: JWT verification failed');
      }
      return res.status(401).json({ error: 'Invalid JWT' });
    }

    const { visitor_id } = decodedToken;
    
    if (!visitor_id) {
      return res.status(401).json({ error: 'Invalid JWT payload' });
    }

    // Fetch visitor data from Supabase with RLS
    const { data: visitorData, error } = await supabaseServiceRole
      .from('visitors')
      .select('id, name, email, phone, cart, street, unit, city, state, postal_code, country, user_id')
      .eq('id', visitor_id)
      .single();

    if (error) {
      if (LOG_ENABLED) {
        console.log('⚠️ Bug 10: Database error fetching visitor:', error);
      }
      return res.status(401).json({ error: 'Visitor not found' });
    }

    if (!visitorData) {
      if (LOG_ENABLED) {
        console.log('⚠️ Bug 10: No visitor found for ID:', visitor_id);
      }
      return res.status(401).json({ error: 'Visitor not found' });
    }

    // UxAuth 2: Check if visitor has an associated account
    const hasAccount = !!visitorData.user_id;
    
    if (LOG_ENABLED) {
      console.log('✅ Bug 10: Visitor validated:', visitor_id, 'has_account:', hasAccount);
    }

    const response: ValidateResponse = {
      visitor: {
        ...visitorData,
        has_account: hasAccount
      },
      visitor_id
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (LOG_ENABLED) {
    console.error('Error in visitor/validate:', error);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
} 