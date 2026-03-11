import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
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
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Fetch user profile from database
//     console.log('[visitor id] checked IN db for user', user.id);
    const { data: visitorData, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Build response with existing data
    const response: UserProfileResponse = {
      id: user.id,
      name: visitorData.name,
      email: visitorData.email,
      phone: visitorData.phone,
      street: visitorData.street,
      unit: visitorData.unit,
      city: visitorData.city,
      state: visitorData.state,
      postal_code: visitorData.postal_code,
      country: visitorData.country,
      stripe_customer_id: visitorData.stripe_cust_id
    };

    // Bug 8D.2: Backfill stripe_cust_id from Stripe if missing
    if (!visitorData.stripe_cust_id && visitorData.email) {
      try {
        const customers = await stripe.customers.list({ email: visitorData.email, limit: 1 });
        if (customers.data.length > 0) {
          const finalStripeCustomerId = customers.data[0].id;
          
          // Update database with Stripe customer ID
//           console.log('[visitor id] updated IN db for user', user.id);
          await supabaseServiceRole
            .from('visitors')
            .update({ stripe_cust_id: finalStripeCustomerId })
            .eq('user_id', user.id);
          
          // Update response
          response.stripe_customer_id = finalStripeCustomerId;
        }
      } catch (err) {
        // Stripe backfill failed - continue without it
      }
    }

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 
