import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole, supabaseAnon } from '../../../lib/supabaseClient';
import { AddressData, addressDataToFields } from '../../../lib/types/address';

interface UpdateAddressRequest {
  address: AddressData;
}

interface UpdateAddressResponse {
  success: boolean;
  message: string;
  address: AddressData;
  user_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UpdateAddressResponse | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract JWT from Authorization header to get the authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the Supabase session token and get user info
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      console.log('⚠️ Invalid Supabase session token:', authError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { address } = req.body as UpdateAddressRequest;

    if (!address) {
      return res.status(400).json({ error: 'Address data is required' });
    }

    // Log the address payload for initial testing
    console.log(`📍 Module 6e: Updating address for user ${user.id}:`, address);

    // For now, we'll store address data in the user's visitor record
    // This follows the pattern where authenticated users have their data in the visitors table
    // with a user_id field linking to their Supabase auth user
    
    // Find the user's visitor record
    const { data: userVisitor, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userVisitor) {
      console.error('Error fetching user visitor record:', fetchError);
      return res.status(404).json({ error: 'User visitor record not found' });
    }

    // Prepare update data with address fields using helper function
    const updateData = addressDataToFields(address);

    // Update user's address in their visitor record
    const { error: updateError } = await supabaseServiceRole
      .from('visitors')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating user address:', updateError);
      return res.status(500).json({ error: 'Failed to update address' });
    }

    console.log(`💾 Module 6e: Address updated for user: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address,
      user_id: user.id
    });

  } catch (error) {
    console.error('Module 6e Error in user updateAddress:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 