import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import { LOG_ENABLED } from '../../../lib/utils/log';
interface InitVisitorRequest {
  visitor_id: string;
}

interface InitVisitorResponse {
  jwt: string;
  visitor_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitor_id }: InitVisitorRequest = req.body;

    if (!visitor_id) {
      return res.status(400).json({ error: 'visitor_id is required' });
    }

    // Create visitor record in database using the visitor_id as the primary key
    // Insert visitor record (or ignore if already exists)
    const { data: visitorRecord, error: insertError } = await supabaseServiceRole
      .from('visitors')
      .upsert({
        id: visitor_id,
        name: null,
        email: null,
        phone: null,
        cart: null
      }, { 
        onConflict: 'id',
        ignoreDuplicates: true 
      })
      .select()
      .single();

    if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
      if (LOG_ENABLED) {
      console.error('Error creating visitor record:', insertError);
      }
      return res.status(500).json({ error: 'Failed to create visitor record' });
    }

    if (LOG_ENABLED) {
      console.log('🗄️ Bug 10: Visitor record initialized:', visitor_id);
    }

    // Generate JWT for the visitor
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }
    
    const token = jwt.sign(
      { 
        visitor_id,
        type: 'visitor',
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    if (LOG_ENABLED) {
      console.log('🔐 Bug 10: JWT generated for visitor:', visitor_id);
    }

    const response: InitVisitorResponse = {
      jwt: token,
      visitor_id
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (LOG_ENABLED) {
    console.error('Error in visitor/init:', error);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
} 