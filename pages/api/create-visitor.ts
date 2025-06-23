import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

interface CreateVisitorRequest {
  visitorId: string;
}

interface CreateVisitorResponse {
  token: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateVisitorResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitorId }: CreateVisitorRequest = req.body;

    // Log incoming visitor ID
    console.log('🔑 Incoming visitor ID for JWT signing:', visitorId);

    if (!visitorId || typeof visitorId !== 'string') {
      return res.status(400).json({ error: 'visitorId is required and must be a string' });
    }

    // Check for JWT secret
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ SUPABASE_JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    // Create JWT payload
    const payload = {
      role: 'anon',
      visitor_id: visitorId
    };

    // Log final payload before signing
    console.log('📋 Final JWT payload before signing:', payload);

    // Sign JWT with 30 day expiration
    const token = jwt.sign(
      payload,
      jwtSecret,
      {
        expiresIn: '30d',
        algorithm: 'HS256'
      }
    );

    console.log('✅ JWT successfully signed for visitor:', visitorId);

    return res.status(200).json({ token });

  } catch (error: any) {
    console.error('❌ JWT signing error:', error);
    return res.status(500).json({ error: 'Failed to create visitor token' });
  }
} 