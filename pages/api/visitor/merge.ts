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
  console.log('[merge] Handler started, method:', req.method);
  
  if (req.method !== 'POST') {
    console.log('[merge] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[merge] Starting merge process...');
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('[merge] Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[merge] Missing or invalid auth header');
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[merge] Token extracted, length:', token.length);

    // Verify Supabase session
    console.log('[merge] Verifying Supabase session...');
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      console.log('[merge] Auth error:', authError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    console.log('[merge] User authenticated:', user.id);

    const { visitor_id }: MergeVisitorRequest = req.body;
    console.log('[merge] Request body visitor_id:', visitor_id);

    if (!visitor_id) {
      console.log('[merge] Missing visitor_id in request body');
      return res.status(400).json({ error: 'visitor_id is required' });
    }

    // Check if user already has a visitor record
    console.log('[visitor id] checked IN db for user', user.id);
    console.log('[merge] Querying for existing visitor with user_id:', user.id);
    const { data: existingUserVisitor, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('id, cart, stripe_cust_id')
      .eq('user_id', user.id)
      .single();

    console.log('[merge] Existing visitor query result:', { existingUserVisitor, fetchError });

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.log('[merge] Database fetch error (not PGRST116):', fetchError);
      return res.status(500).json({ error: 'Error fetching visitor data' });
    }

    let mergedVisitorId = visitor_id;
    let merged = false;

    // If no visitor found by user_id, check by email as fallback
    let targetVisitor = existingUserVisitor;
    if (!existingUserVisitor && user.email) {
      console.log('[merge] No visitor found by user_id, checking by email:', user.email);
      const { data: emailVisitor, error: emailError } = await supabaseServiceRole
        .from('visitors')
        .select('id, cart, stripe_cust_id, user_id')
        .eq('email', user.email)
        .single();

      console.log('[merge] Email-based visitor query result:', { emailVisitor, emailError });

      if (!emailError && emailVisitor) {
        console.log('[merge] Found visitor by email, will merge and set user_id');
        targetVisitor = emailVisitor;
      }
    }

    if (targetVisitor) {
      console.log('[merge] Found existing visitor for user:', targetVisitor.id);
      
      // Guard: Check if visitor_id already belongs to this user
      if (targetVisitor.id === visitor_id) {
        console.log('[merge] Visitor already belongs to user, no merge needed');
        // No merge needed - visitor already belongs to user
        mergedVisitorId = targetVisitor.id;
        merged = false;
      } else {
        console.log('[merge] Merging carts from visitor', visitor_id, 'to existing visitor', targetVisitor.id);
        
        // User already has a visitor record, merge carts
        const existingCart = targetVisitor.cart || [];
        const newCart = req.body.cart || [];

        // Merge carts (simple concatenation for now)
        const mergedCart = [...existingCart, ...newCart];

        // Preserve Stripe customer ID if it exists
        const stripeCustIdToUpdate = targetVisitor.stripe_cust_id;

        // Update existing visitor record with merged data AND set user_id if not set
        const updatePayload: any = {
          cart: mergedCart,
          stripe_cust_id: stripeCustIdToUpdate
        };

        // If this visitor doesn't have user_id set (found by email), set it now
        if (!targetVisitor.user_id) {
          console.log('[merge] Setting user_id on visitor found by email');
          updatePayload.user_id = user.id;
        }

        console.log('[visitor id] updated IN db', targetVisitor.id.substring(0, 4) + '...');
        console.log('[merge] Updating existing visitor with merged cart...');
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update(updatePayload)
          .eq('id', targetVisitor.id);

        if (updateError) {
          console.log('[merge] Error updating existing visitor:', updateError);
          return res.status(500).json({ error: 'Error updating existing user visitor' });
        }

        // Delete the temporary visitor record
        console.log('[visitor id] removed IN db', visitor_id.substring(0, 4) + '...');
        console.log('[merge] Deleting temporary visitor record...');
        const { error: deleteError } = await supabaseServiceRole
          .from('visitors')
          .delete()
          .eq('id', visitor_id);

        if (deleteError) {
          console.log('[merge] Error deleting temporary visitor:', deleteError);
          return res.status(500).json({ error: 'Error deleting temporary visitor' });
        }

        mergedVisitorId = targetVisitor.id;
        merged = true;
        console.log('[merge] Merge completed successfully');
      }
    } else {
      console.log('[merge] No existing visitor found, assigning current visitor to user');
      
      // Assign visitor to user
      console.log('[visitor id] updated IN db', visitor_id.substring(0, 4) + '...');
      console.log('[merge] Updating visitor with user_id...');
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({
          user_id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || null
        })
        .eq('id', visitor_id);

      if (updateError) {
        console.log('[merge] Error assigning visitor to user:', updateError);
        return res.status(500).json({ error: 'Error assigning visitor to user' });
      }
      
      console.log('[merge] Visitor successfully assigned to user');
    }

    // Generate new JWT for the merged visitor
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    console.log('[merge] SUPABASE_JWT_SECRET defined:', !!jwtSecret);
    if (!jwtSecret) {
      console.error('[merge] JWT secret missing at runtime');
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    let newToken;
    try {
      newToken = jwt.sign(
        { 
          visitor_id: mergedVisitorId,
          type: 'visitor',
          iat: Math.floor(Date.now() / 1000)
        },
        jwtSecret,
        { expiresIn: '30d' }
      );
      console.log('[merge] JWT successfully signed for visitor', mergedVisitorId.substring(0, 4) + '...');
    } catch (jwtError) {
      console.error('[merge] Error during JWT signing:', jwtError);
      return res.status(500).json({ error: 'JWT signing failed', details: jwtError?.message || jwtError });
    }

    // Fetch final visitor data
    const { data: finalVisitorData, error: finalVisitorError } = await supabaseServiceRole
      .from('visitors')
      .select('name, email, phone, cart, street, unit, city, state, postal_code, country')
      .eq('id', mergedVisitorId)
      .single();
    if (finalVisitorError) {
      console.error('[merge] Error fetching final visitor data:', finalVisitorError);
    } else {
      console.log('[merge] Final visitor data fetched for', mergedVisitorId.substring(0, 4) + '...');
    }

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
    console.error('[merge] Caught error:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message || error });
  }
} 