import { NextApiRequest, NextApiResponse } from 'next';
import * as jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';

interface UpdateCartRequest {
  cart: object;
}

interface UpdateCartResponse {
  success: boolean;
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UpdateCartResponse | { error: string }>) {
  if (req.method !== 'POST') {
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
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decodedToken.type !== 'visitor') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    const visitorId = decodedToken.visitor_id;
    const { cart } = req.body as UpdateCartRequest;

    if (!cart) {
      return res.status(400).json({ error: 'Cart data is required' });
    }

    // Update visitor's cart in database
    const { error } = await supabaseServiceRole
      .from('visitors')
      .update({ cart })
      .eq('id', visitorId);

    if (error) {
      console.error('Error updating visitor cart:', error);
      return res.status(500).json({ error: 'Failed to update cart' });
    }

    console.log(`💾 Cart updated for visitor: ${visitorId}`);

    return res.status(200).json({
      success: true,
      message: 'Cart updated successfully'
    });

  } catch (error) {
    console.error('Error in updateCart:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 