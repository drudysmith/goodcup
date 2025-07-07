import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole, supabaseAnon } from '../../../lib/supabaseClient';

interface MergeRequest {
  visitor_id: string;
}

interface MergeResponse {
  success: boolean;
  visitor_id: string;
  user_id: string;
  merged: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MergeResponse | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract JWT from Authorization header to get the authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the Supabase session token and get user info
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      console.log('⚠️ Invalid Supabase session token:', authError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { visitor_id } = req.body as MergeRequest;

    if (!visitor_id) {
      return res.status(400).json({ error: 'visitor_id is required' });
    }

    console.log(`🔄 Module 6b.1: Merging visitor ${visitor_id} with user ${user.id}`);

    // Check if visitor exists
    const { data: visitorData, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('id', visitor_id)
      .single();

    if (fetchError || !visitorData) {
      console.error('Error fetching visitor:', fetchError);
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Check if this user already has a visitor record
    const { data: existingUserVisitor, error: existingError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let mergedVisitorId = visitor_id;
    let merged = false;

    if (existingUserVisitor) {
      // User already has a visitor record - merge current visitor into existing one
      console.log(`🔄 User ${user.id} already has visitor record ${existingUserVisitor.id}, merging carts`);
      
      // Merge cart data
      const currentCart = Array.isArray(visitorData.cart) ? visitorData.cart : [];
      const existingCart = Array.isArray(existingUserVisitor.cart) ? existingUserVisitor.cart : [];

      const mergedCart = [...existingCart, ...currentCart].reduce<any[]>((acc, item) => {
        const found = acc.find(i => i.priceId === item.priceId);
        if (found) {
          found.quantity += item.quantity;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []);

      // Update existing user visitor with merged data
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({
          email: visitorData.email || existingUserVisitor.email,
          phone: visitorData.phone || existingUserVisitor.phone,
          name: visitorData.name || existingUserVisitor.name,
          cart: mergedCart
        })
        .eq('id', existingUserVisitor.id);

      if (updateError) {
        console.error('Error updating existing user visitor:', updateError);
        return res.status(500).json({ error: 'Failed to merge visitor data' });
      }

      // Delete the temporary visitor record
      const { error: deleteError } = await supabaseServiceRole
        .from('visitors')
        .delete()
        .eq('id', visitor_id);

      if (deleteError) {
        console.error('Error deleting temporary visitor:', deleteError);
        // Don't fail the request, just log the error
      }

      mergedVisitorId = existingUserVisitor.id;
      merged = true;
    } else {
      // No existing visitor for this user - just assign user_id to current visitor
      console.log(`📝 Assigning visitor ${visitor_id} to user ${user.id}`);
      
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({ user_id: user.id })
        .eq('id', visitor_id);

      if (updateError) {
        console.error('Error assigning visitor to user:', updateError);
        return res.status(500).json({ error: 'Failed to assign visitor to user' });
      }
    }

    console.log(`✅ Module 6b.1: Visitor merge completed - visitor_id: ${mergedVisitorId}, user_id: ${user.id}, merged: ${merged}`);

    return res.status(200).json({
      success: true,
      visitor_id: mergedVisitorId,
      user_id: user.id,
      merged
    });

  } catch (error) {
    console.error('Module 6b.1 Error in visitor merge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 