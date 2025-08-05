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

    // Search for existing visitors with this email
//     console.log('[visitor id] checked IN db for email', user.email);
    const { data: existingVisitors, error: searchError } = await supabaseServiceRole
      .from('visitors')
      .select('id, cart, stripe_cust_id, user_id, name, email')
      .eq('email', user.email);

    if (searchError) {
      return res.status(500).json({ error: 'Error searching for existing visitors' });
    }

    let mergedVisitorId = visitor_id;
    let merged = false;

    if (existingVisitors && existingVisitors.length > 0) {
      // Found existing visitor(s) with this email
      const existingVisitor = existingVisitors[0];
      
      // Check if existing visitor already belongs to this user
      if (existingVisitor.user_id === user.id) {
        // Visitor already belongs to this user, no merge needed
        mergedVisitorId = existingVisitor.id;
        merged = false;
      } else {
        // Found existing visitor with same email but different user, merge carts
        const existingCart = existingVisitor.cart || [];
        const newCart = req.body.cart || [];

        // Merge carts (simple concatenation for now)
        const mergedCart = [...existingCart, ...newCart];

        // Preserve Stripe customer ID if it exists
        const stripeCustIdToUpdate = existingVisitor.stripe_cust_id;

        // Update existing visitor record with merged data and assign to user
//         console.log('[visitor id] updated IN db', existingVisitor.id.substring(0, 4) + '...');
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update({
            user_id: user.id,
            cart: mergedCart,
            stripe_cust_id: stripeCustIdToUpdate,
            name: user.user_metadata?.name || existingVisitor.name,
            email: user.email || existingVisitor.email
          })
          .eq('id', existingVisitor.id);

        if (updateError) {
          return res.status(500).json({ error: 'Error updating existing visitor' });
        }

        // Delete the current visitor record since we merged into the existing one
        if (visitor_id !== existingVisitor.id) {
//           console.log('[visitor id] removed IN db', visitor_id.substring(0, 4) + '...');
          const { error: deleteError } = await supabaseServiceRole
            .from('visitors')
            .delete()
            .eq('id', visitor_id);

          if (deleteError) {
            return res.status(500).json({ error: 'Error deleting temporary visitor' });
          }
        }

        mergedVisitorId = existingVisitor.id;
        merged = true;
      }
    } else {
      // No existing visitor found, assign current visitor to user
//       console.log('[visitor id] updated IN db', visitor_id.substring(0, 4) + '...');
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
