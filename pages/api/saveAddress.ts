import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole, supabaseAnon } from '../../lib/supabaseClient';

interface AddressPayload {
  street: string;
  unit?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface SaveAddressRequest {
  address: AddressPayload;
}

interface SaveAddressResponse {
  success: boolean;
  visitor_id: string;
  user_id?: string;
  auth_method: 'supabase_session' | 'visitor_jwt';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body as SaveAddressRequest;

    if (!address || !address.street || !address.city || !address.state || !address.postal_code || !address.country) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    console.log('📍 Module 6e.p: Received address payload:', address);

    // Try Supabase session first
    try {
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
      
      if (!authError && user) {
        console.log('🔐 Module 6e.p: Authenticated via Supabase session, user ID:', user.id);
        
        // Find visitor record by user_id
        const { data: visitorData, error: fetchError } = await supabaseServiceRole
          .from('visitors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (fetchError || !visitorData) {
          console.error('⚠️ No visitor record found for user:', user.id);
          return res.status(404).json({ error: 'Visitor record not found for user' });
        }

        console.log('📍 Module 6e.p: Would update visitor record', visitorData.id, 'with address:', address);

        return res.status(200).json({
          success: true,
          visitor_id: visitorData.id,
          user_id: user.id,
          auth_method: 'supabase_session'
        });
      }
    } catch (supabaseError) {
      // Not a Supabase session, try visitor JWT
      console.log('🔍 Module 6e.p: Not a Supabase session, trying visitor JWT');
    }

    // Try visitor JWT validation
    try {
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      const decodedToken = jwt.verify(token, jwtSecret!) as any;
      const { visitor_id } = decodedToken;

      if (!visitor_id) {
        return res.status(401).json({ error: 'Invalid JWT payload' });
      }

      console.log('🔐 Module 6e.p: Authenticated via visitor JWT, visitor ID:', visitor_id);

      // Verify visitor exists
      const { data: visitorData, error: fetchError } = await supabaseServiceRole
        .from('visitors')
        .select('id')
        .eq('id', visitor_id)
        .single();

      if (fetchError || !visitorData) {
        console.error('⚠️ Visitor not found:', visitor_id);
        return res.status(404).json({ error: 'Visitor not found' });
      }

      console.log('📍 Module 6e.p: Would update visitor record', visitor_id, 'with address:', address);

      return res.status(200).json({
        success: true,
        visitor_id,
        auth_method: 'visitor_jwt'
      });

    } catch (jwtError) {
      console.log('⚠️ Module 6e.p: JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

  } catch (error: any) {
    console.error('Module 6e.p Error in saveAddress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 