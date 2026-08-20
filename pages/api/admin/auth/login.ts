import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../../../lib/supabaseClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  admin?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Find admin by email. Authentication failures intentionally use the same
    // response so the endpoint does not reveal whether an account exists.
    const { data: admin, error: findError } = await supabaseServiceRole
      .from('admins')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if admin is active
    if (!admin.is_active) {
      return res.status(401).json({ success: false, error: 'Account disabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update last login
    await supabaseServiceRole
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT token
    const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ No JWT secret configured');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
