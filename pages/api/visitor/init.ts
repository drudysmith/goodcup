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

    // Generate JWT for the visitor
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
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