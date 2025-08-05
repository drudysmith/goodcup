import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole, supabaseAnon } from '../../lib/supabaseClient';

interface SaveContactInfoRequest {
  email: string;
  phone?: string;
  name?: string;
}

interface SaveContactInfoResponse {
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
    const { email, phone, name } = req.body as SaveContactInfoRequest;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try Supabase session first
    try {
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
      
      if (!authError && user) {
        // Find visitor record by user_id
//         console.log('[visitor id] checked IN db for user', user.id);
        const { data: visitorData, error: fetchError } = await supabaseServiceRole
          .from('visitors')
          .select('id, email, phone, name')
          .eq('user_id', user.id)
          .single();

        if (fetchError || !visitorData) {
          return res.status(404).json({ error: 'Visitor record not found for user' });
        }

        // Build update payload - update contact fields when provided
        const updatePayload: any = {};
        
        // Contact fields - update when provided
        if (email) updatePayload.email = email;
        if (phone) updatePayload.phone = phone;
        if (name) updatePayload.name = name;

        // Only update if there are fields to update
        if (Object.keys(updatePayload).length > 0) {
//           console.log('[visitor id] updated contact IN db', visitorData.id.substring(0, 4) + '...');
          const { error: updateError } = await supabaseServiceRole
            .from('visitors')
            .update(updatePayload)
            .eq('id', visitorData.id);

          if (updateError) {
            return res.status(500).json({ error: 'Failed to save contact info' });
          }
        }

        return res.status(200).json({
          success: true,
          visitor_id: visitorData.id,
          user_id: user.id,
          auth_method: 'supabase_session'
        });
      }
    } catch (supabaseError) {
      // Not a Supabase session, try visitor JWT
    }

    // Try visitor JWT validation
    try {
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      const decodedToken = jwt.verify(token, jwtSecret!) as any;
      const { visitor_id } = decodedToken;

      if (!visitor_id) {
        return res.status(401).json({ error: 'Invalid JWT payload' });
      }

      // Get current visitor data
//       console.log('[visitor id] checked IN db', visitor_id.substring(0, 4) + '...');
      const { data: visitorData, error: fetchError } = await supabaseServiceRole
        .from('visitors')
        .select('id, email, phone, name')
        .eq('id', visitor_id)
        .single();

      if (fetchError || !visitorData) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      // Build update payload - update contact fields when provided
      const updatePayload: any = {};
      
      // Contact fields - update when provided
      if (email) updatePayload.email = email;
      if (phone) updatePayload.phone = phone;
      if (name) updatePayload.name = name;

      // Only update if there are fields to update
      if (Object.keys(updatePayload).length > 0) {
//         console.log('[visitor id] updated contact IN db', visitor_id.substring(0, 4) + '...');
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update(updatePayload)
          .eq('id', visitor_id);

        if (updateError) {
          return res.status(500).json({ error: 'Failed to save contact info' });
        }
      }

      return res.status(200).json({
        success: true,
        visitor_id,
        auth_method: 'visitor_jwt'
      });

    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 
