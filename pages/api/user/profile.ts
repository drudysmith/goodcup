import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAnon, supabaseServiceRole } from '../../../lib/supabaseClient';
import Stripe from 'stripe';
import { LOG_ENABLED } from '../../../lib/utils/log';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

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
  stripe_customer_id: string | null;
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
      if (LOG_ENABLED) {
      console.error('Module 7: Authentication failed:', authError);
      }
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    if (LOG_ENABLED) {
    console.log('🔄 Module 7: Fetching user profile for user ID:', user.id);
    }

    // Find visitor record associated with this user
    const { data: visitorData, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (LOG_ENABLED) {
      console.error('Module 7: Error fetching user profile:', fetchError);
      }
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (LOG_ENABLED) {
    console.log('✅ Module 7: User profile loaded successfully');
    
    // SMU 4.3a: Log the Stripe customer ID
    if (LOG_ENABLED) {
    console.log('🔄 Module 4.3a: Stripe customer ID:', visitorData.stripe_cust_id);
    }
    }

    // Only use the value from the DB, no backfill
    let finalStripeCustomerId = visitorData.stripe_cust_id;
    // 8D.2: Backfill Stripe customer ID if missing
    if (!finalStripeCustomerId && user.email) {
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          finalStripeCustomerId = customers.data[0].id;
          // Update the visitor record in Supabase
          await supabaseServiceRole
            .from('visitors')
            .update({ stripe_cust_id: finalStripeCustomerId })
            .eq('id', visitorData.id);
          if (LOG_ENABLED) {
            console.log('🔄 Bug 8D.2: Backfilled stripe_cust_id from Stripe:', finalStripeCustomerId);
          }
        }
      } catch (err) {
        if (LOG_ENABLED) {
          console.error('Bug 8D.2: Stripe backfill failed or Stripe unreachable:', err);
        }
        // Proceed without failing the request
      }
    }

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
      stripe_customer_id: finalStripeCustomerId,
    };

    return res.status(200).json(profile);

  } catch (error: any) {
    if (LOG_ENABLED) {
    console.error('Module 7: Error in user profile endpoint:', error);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
} 