import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
console.log('>> initializing init.ts');
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
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert visitor record (or ignore if already exists)
    const { data: visitorRecord, error: insertError } = await supabase
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
      console.error('Error creating visitor record:', insertError);
      return res.status(500).json({ error: 'Failed to create visitor record' });
    }

    console.log('🗄️ Visitor record created/found in database:', visitor_id);

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

    console.log('🔐 Generated JWT for visitor:', visitor_id);

    const response: InitVisitorResponse = {
      jwt: token,
      visitor_id
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in visitor/init:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 