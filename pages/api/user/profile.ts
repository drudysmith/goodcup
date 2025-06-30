import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAnon, supabaseServiceRole } from '../../../lib/supabaseClient';

interface UserProfileResponse {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify Supabase session
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Module 7: Authentication failed:', authError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    console.log('🔄 Module 7: Fetching user profile for user ID:', user.id);

    // Find visitor record associated with this user
    const { data: visitorData, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Module 7: Error fetching user profile:', fetchError);
      return res.status(404).json({ error: 'User profile not found' });
    }

    console.log('✅ Module 7: User profile loaded successfully');

    // Return user profile data
    const profile: UserProfileResponse = {
      id: visitorData.id,
      name: visitorData.name,
      email: visitorData.email,
      phone: visitorData.phone,
      street: visitorData.street,
      unit: visitorData.unit,
      city: visitorData.city,
      state: visitorData.state,
      postal_code: visitorData.postal_code,
      country: visitorData.country,
    };

    return res.status(200).json(profile);

  } catch (error: any) {
    console.error('Module 7: Error in user profile endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 