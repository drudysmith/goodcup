import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
  type: string;
}

export interface AdminSession extends AdminTokenPayload {
  id: string;
}

export async function verifyAdminAuth(req: NextApiRequest): Promise<{
  isAdmin: boolean;
  admin?: AdminSession;
  error?: string;
}> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('❌ No JWT secret configured for admin auth');
      return { isAdmin: false, error: 'Server configuration error' };
    }

    const decoded = jwt.verify(token, jwtSecret) as AdminTokenPayload;
    
    if (decoded.type !== 'admin') {
      return { isAdmin: false, error: 'Invalid token type' };
    }

    return {
      isAdmin: true,
      admin: {
        id: decoded.adminId,
        adminId: decoded.adminId,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type
      }
    };

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { isAdmin: false, error: 'Invalid token' };
    } else if (error instanceof jwt.TokenExpiredError) {
      return { isAdmin: false, error: 'Token expired' };
    }
    
    console.error('❌ Admin auth verification error:', error);
    return { isAdmin: false, error: 'Authentication failed' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.isAdmin) {
    return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
  }

  return res.status(200).json({ success: true, admin: auth.admin });
}
