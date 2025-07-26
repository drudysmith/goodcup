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

interface SaveContactRequest {
  email: string;
  phone?: string;
  name?: string;
  address: AddressPayload;
}

interface SaveContactResponse {
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
    const { email, phone, name, address } = req.body as SaveContactRequest;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!address || !address.street || !address.city || !address.state || !address.postal_code || !address.country) {
      return res.status(400).json({ error: 'Missing required address fields' });
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
        const { data: visitorData, error: fetchError } = await supabaseServiceRole
          .from('visitors')
          .select('id, email, phone, name, street, unit, city, state, postal_code, country')
          .eq('user_id', user.id)
          .single();

        if (fetchError || !visitorData) {
          return res.status(404).json({ error: 'Visitor record not found for user' });
        }

        // Build dynamic update payload - only update fields that are null in database
        const updatePayload: any = {};
        
        // Contact fields - conditional updates
        if (visitorData.email === null && email) updatePayload.email = email;
        if (visitorData.phone === null && phone) updatePayload.phone = phone;
        if (visitorData.name === null && name) updatePayload.name = name;
        
        // Address fields - conditional updates
        if (visitorData.street === null && address.street) updatePayload.street = address.street;
        if (visitorData.unit === null && address.unit) updatePayload.unit = address.unit;
        if (visitorData.city === null && address.city) updatePayload.city = address.city;
        if (visitorData.state === null && address.state) updatePayload.state = address.state;
        if (visitorData.postal_code === null && address.postal_code) updatePayload.postal_code = address.postal_code;
        if (visitorData.country === null && address.country) updatePayload.country = address.country;

        // Only update if there are fields to update
        if (Object.keys(updatePayload).length > 0) {
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
      const { data: visitorData, error: fetchError } = await supabaseServiceRole
        .from('visitors')
        .select('id, email, phone, name, street, unit, city, state, postal_code, country')
        .eq('id', visitor_id)
        .single();

      if (fetchError || !visitorData) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      // Build dynamic update payload - only update fields that are null in database
      const updatePayload: any = {};
      
      // Contact fields - conditional updates
      if (visitorData.email === null && email) updatePayload.email = email;
      if (visitorData.phone === null && phone) updatePayload.phone = phone;
      if (visitorData.name === null && name) updatePayload.name = name;
      
      // Address fields - conditional updates
      if (visitorData.street === null && address.street) updatePayload.street = address.street;
      if (visitorData.unit === null && address.unit) updatePayload.unit = address.unit;
      if (visitorData.city === null && address.city) updatePayload.city = address.city;
      if (visitorData.state === null && address.state) updatePayload.state = address.state;
      if (visitorData.postal_code === null && address.postal_code) updatePayload.postal_code = address.postal_code;
      if (visitorData.country === null && address.country) updatePayload.country = address.country;

      // Only update if there are fields to update
      if (Object.keys(updatePayload).length > 0) {
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