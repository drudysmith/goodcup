import { NextApiRequest, NextApiResponse } from 'next';
import * as jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import { AddressData, addressDataToFields } from '../../../lib/types/address';

interface UpdateAddressRequest {
  address: AddressData;
}

interface UpdateAddressResponse {
  success: boolean;
  message: string;
  address: AddressData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UpdateAddressResponse | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, jwtSecret) as { visitor_id: string; type: string };
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decodedToken.type !== 'visitor') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    const visitorId = decodedToken.visitor_id;
    const { address } = req.body as UpdateAddressRequest;

    if (!address) {
      return res.status(400).json({ error: 'Address data is required' });
    }

    // Log the address payload for initial testing
    console.log(`📍 Module 6e: Updating address for visitor ${visitorId}:`, address);

    // Prepare update data with address fields using helper function
    const updateData = addressDataToFields(address);

    // Update visitor's address in database
    const { error } = await supabaseServiceRole
      .from('visitors')
      .update(updateData)
      .eq('id', visitorId);

    if (error) {
      console.error('Error updating visitor address:', error);
      return res.status(500).json({ error: 'Failed to update address' });
    }

    console.log(`💾 Module 6e: Address updated for visitor: ${visitorId}`);

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address
    });

  } catch (error) {
    console.error('Module 6e Error in updateAddress:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 