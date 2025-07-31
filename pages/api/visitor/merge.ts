import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole, supabaseAnon } from '../../../lib/supabaseClient';
import jwt from 'jsonwebtoken';

interface MergeVisitorRequest {
  visitor_id: string;
}

interface MergeVisitorResponse {
  visitor_id: string;
  jwt: string;
  visitor: {
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
  };
  merged: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Supabase session
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { visitor_id }: MergeVisitorRequest = req.body;

    if (!visitor_id) {
      return res.status(400).json({ error: 'visitor_id is required' });
    }

    // Check if user already has a visitor record
    console.log('[visitor id] checked IN db for user', user.id);
    const { data: existingUserVisitor, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('id, cart, stripe_cust_id')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Error fetching visitor data' });
    }

    let mergedVisitorId = visitor_id;
    let merged = false;

    if (existingUserVisitor) {
      // Guard: Check if visitor_id already belongs to this user
      if (existingUserVisitor.id === visitor_id) {
        // No merge needed - visitor already belongs to user
        mergedVisitorId = existingUserVisitor.id;
        merged = false;
      } else {
        // User already has a visitor record, merge carts
        const existingCart = existingUserVisitor.cart || [];
        const newCart = req.body.cart || [];

        // Merge carts (simple concatenation for now)
        const mergedCart = [...existingCart, ...newCart];

        // Preserve Stripe customer ID if it exists
        const stripeCustIdToUpdate = existingUserVisitor.stripe_cust_id;

        // Update existing visitor record with merged data
        console.log('[visitor id] updated IN db', existingUserVisitor.id.substring(0, 4) + '...');
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update({
            cart: mergedCart,
            stripe_cust_id: stripeCustIdToUpdate
          })
          .eq('id', existingUserVisitor.id);

        if (updateError) {
          return res.status(500).json({ error: 'Error updating existing user visitor' });
        }

        // Delete the temporary visitor record
        console.log('[visitor id] removed IN db', visitor_id.substring(0, 4) + '...');
        const { error: deleteError } = await supabaseServiceRole
          .from('visitors')
          .delete()
          .eq('id', visitor_id);

        if (deleteError) {
          return res.status(500).json({ error: 'Error deleting temporary visitor' });
        }

        mergedVisitorId = existingUserVisitor.id;
        merged = true;
      }
    } else {
      // Assign visitor to user
      console.log('[visitor id] updated IN db', visitor_id.substring(0, 4) + '...');
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({
          user_id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || null
        })
        .eq('id', visitor_id);

      if (updateError) {
        return res.status(500).json({ error: 'Error assigning visitor to user' });
      }
    }

    // Generate new JWT for the merged visitor
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const newToken = jwt.sign(
      { 
        visitor_id: mergedVisitorId,
        type: 'visitor',
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // Fetch final visitor data
    const { data: finalVisitorData } = await supabaseServiceRole
      .from('visitors')
      .select('name, email, phone, cart, street, unit, city, state, postal_code, country')
      .eq('id', mergedVisitorId)
      .single();

    const response: MergeVisitorResponse = {
      visitor_id: mergedVisitorId,
      jwt: newToken,
      visitor: {
        name: finalVisitorData?.name || null,
        email: finalVisitorData?.email || null,
        phone: finalVisitorData?.phone || null,
        cart: finalVisitorData?.cart || null,
        street: finalVisitorData?.street || null,
        unit: finalVisitorData?.unit || null,
        city: finalVisitorData?.city || null,
        state: finalVisitorData?.state || null,
        postal_code: finalVisitorData?.postal_code || null,
        country: finalVisitorData?.country || null
      },
      merged
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 