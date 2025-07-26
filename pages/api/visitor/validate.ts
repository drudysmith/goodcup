import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';

interface ValidateVisitorResponse {
  visitor: {
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
    has_account: boolean;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, jwtSecret) as { visitor_id: string; type: string };
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decodedToken.type !== 'visitor') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    const visitor_id = decodedToken.visitor_id;

    // Fetch visitor data from database
    const { data: visitorData, error } = await supabaseServiceRole
      .from('visitors')
      .select('id, name, email, phone, cart, street, unit, city, state, postal_code, country, user_id')
      .eq('id', visitor_id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Database error fetching visitor' });
    }

    if (!visitorData) {
      return res.status(404).json({ error: 'No visitor found for ID' });
    }

    // Check if visitor has an associated user account
    const hasAccount = !!visitorData.user_id;

    const response: ValidateVisitorResponse = {
      visitor: {
        id: visitorData.id,
        name: visitorData.name,
        email: visitorData.email,
        phone: visitorData.phone,
        cart: visitorData.cart,
        street: visitorData.street,
        unit: visitorData.unit,
        city: visitorData.city,
        state: visitorData.state,
        postal_code: visitorData.postal_code,
        country: visitorData.country,
        has_account: hasAccount
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 