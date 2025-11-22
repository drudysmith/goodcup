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

    // Find admin by email
    console.log('🔍 Looking for admin with email:', email.toLowerCase());
    const { data: admin, error: findError } = await supabaseServiceRole
      .from('admins')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !admin) {
      console.log('❌ Admin not found:', email, 'Error:', findError);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    console.log('✅ Admin found:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      is_active: admin.is_active,
      password_hash_length: admin.password_hash?.length
    });

    // Check if admin is active
    if (!admin.is_active) {
      console.log('❌ Admin account disabled:', email);
      return res.status(401).json({ success: false, error: 'Account disabled' });
    }

    // Verify password
    console.log('🔐 Attempting password verification...');
    console.log('📝 Input password:', password);
    console.log('🔑 Stored hash:', admin.password_hash);
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    console.log('✅ Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for admin:', email);
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

    console.log('✅ Admin login successful:', email, admin.role);

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
