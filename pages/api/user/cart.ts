import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../../lib/supabaseClient';

interface UserCartResponse {
  cart: any[] | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Supabase session
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    if (req.method === 'GET') {
      // Fetch user cart from database
      console.log('[visitor id] checked IN db for user', user.id);
      const { data: visitorData, error: fetchError } = await supabaseServiceRole
        .from('visitors')
        .select('cart')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'User cart not found' });
      }

      const response: UserCartResponse = {
        cart: visitorData.cart || null,
      };

      res.status(200).json(response);
    } else if (req.method === 'POST') {
      // Update user cart in database
      const { cart } = req.body;

      if (!cart) {
        return res.status(400).json({ error: 'Cart data is required' });
      }

      console.log('[visitor id] updated IN db for user', user.id);
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({ cart })
        .eq('user_id', user.id);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update cart' });
      }

      res.status(200).json({
        success: true,
        message: 'Cart updated successfully'
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 