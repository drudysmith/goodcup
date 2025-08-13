import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServiceRole } from '../../lib/supabaseClient';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface ShipmentOrderData {
  // Contact info
  email: string;
  phone?: string;
  recipient_name: string;
  
  // Address info
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  
  // Shipping mode and metadata
  shipping_mode: 'gift' | 'self';
  is_address_dirty: boolean;
  cart_items: any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   console.log('🚀 API: /api/saveShipmentOrder endpoint reached');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shipmentData }: { shipmentData: ShipmentOrderData } = req.body;
    
    if (!shipmentData) {
      return res.status(400).json({ error: 'Shipment data is required' });
    }

    // Validate required fields
    if (!shipmentData.email || !shipmentData.recipient_name || !shipmentData.address_line1 || 
        !shipmentData.city || !shipmentData.state || !shipmentData.postal_code || 
        !shipmentData.country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get authentication token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    let visitorId: string;
    let userSession = null;

    try {
      // Try Supabase session first
      const { data: { user }, error } = await supabaseServiceRole.auth.getUser(token);
      if (!error && user) {
        userSession = user;
        // Get visitor ID from user metadata or visitors table
        const { data: visitorData } = await supabaseServiceRole
          .from('visitors')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (visitorData) {
          visitorId = visitorData.id;
        } else {
          return res.status(404).json({ error: 'Visitor record not found for user' });
        }
      } else {
        // Try visitor JWT
        try {
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { visitor_id: string };
          visitorId = decoded.visitor_id;
        } catch (jwtError) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
    } catch (authError) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Get current visitor data
    const { data: visitorData, error: visitorError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single();

    if (visitorError || !visitorData) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    //     console.log('🚀 SaveShipmentOrder API: Processing request for visitor:', visitorId);
    //     console.log('🚀 SaveShipmentOrder API: Shipping mode:', shipmentData.shipping_mode);
    //     console.log('🚀 SaveShipmentOrder API: Address dirty:', shipmentData.is_address_dirty);

    // Step 1: Update visitors table if address data is dirty (changed) and not gift shipping
    if (shipmentData.is_address_dirty && shipmentData.shipping_mode !== 'gift') {
       console.log('🚀 SaveShipmentOrder API: Address is dirty, updating visitor record...');
      
      const visitorUpdatePayload: any = {};
      
      // Update address fields if they've changed
      if (shipmentData.recipient_name && shipmentData.recipient_name !== visitorData.name) {
        visitorUpdatePayload.name = shipmentData.recipient_name;
      }
      if (shipmentData.address_line1 && shipmentData.address_line1 !== visitorData.street) {
        visitorUpdatePayload.street = shipmentData.address_line1;
      }
      if (shipmentData.address_line2 !== visitorData.unit) {
        visitorUpdatePayload.unit = shipmentData.address_line2 || null;
      }
      if (shipmentData.city && shipmentData.city !== visitorData.city) {
        visitorUpdatePayload.city = shipmentData.city;
      }
      if (shipmentData.state && shipmentData.state !== visitorData.state) {
        visitorUpdatePayload.state = shipmentData.state;
      }
      if (shipmentData.postal_code && shipmentData.postal_code !== visitorData.postal_code) {
        visitorUpdatePayload.postal_code = shipmentData.postal_code;
      }
      if (shipmentData.country && shipmentData.country !== visitorData.country) {
        visitorUpdatePayload.country = shipmentData.country;
      }
      if (shipmentData.phone && shipmentData.phone !== visitorData.phone) {
        visitorUpdatePayload.phone = shipmentData.phone;
      }

      if (Object.keys(visitorUpdatePayload).length > 0) {
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update(visitorUpdatePayload)
          .eq('id', visitorId);

        if (updateError) {
          console.error('🚀 SaveShipmentOrder API: Error updating visitor:', updateError);
          return res.status(500).json({ error: 'Failed to update visitor data' });
        }
        
//         console.log('🚀 SaveShipmentOrder API: Visitor record updated successfully');
      } else {
//         console.log('🚀 SaveShipmentOrder API: No changes detected in visitor data');
      }
    } else {
//       console.log('🚀 SaveShipmentOrder API: Address not dirty, skipping visitor update');
    }

    // Step 2: Create shipment order record
//     console.log('🚀 SaveShipmentOrder API: Creating shipment order record...');
    
    const orderId = uuidv4();
    const isGift = shipmentData.shipping_mode === 'gift';
    
    const shipmentOrderPayload = {
      order_id: orderId,
      // order_type is set later by webhook based on Stripe session.mode ('subscription' | 'payment')
      order_type: null,
      recipient_name: shipmentData.recipient_name,
      address_line1: shipmentData.address_line1,
      address_line2: shipmentData.address_line2 || null,
      city: shipmentData.city,
      state: shipmentData.state,
      postal_code: shipmentData.postal_code,
      country: shipmentData.country,
      order_info: shipmentData.cart_items || [],
      created_at: new Date().toISOString(),
      fulfilled_at: null,
      gift: isGift,
      phone_number: shipmentData.phone || visitorData.phone || null,
      initial_order: true,
      purchasing_visitor_id: visitorId,
      status: 'pending',
      email: shipmentData.email
    };

    const { data: shipmentOrder, error: shipmentError } = await supabaseServiceRole
      .from('shipment_orders')
      .insert([shipmentOrderPayload])
      .select()
      .single();

    if (shipmentError) {
      console.error('🚀 SaveShipmentOrder API: Error creating shipment order:', shipmentError);
      return res.status(500).json({ error: 'Failed to create shipment order' });
    }

//     console.log('🚀 SaveShipmentOrder API: Shipment order created successfully:', orderId);

    return res.status(200).json({ 
      success: true, 
      order_id: orderId,
      gift: isGift,
      message: 'Shipment order saved successfully' 
    });

  } catch (error) {
    console.error('🚀 SaveShipmentOrder API: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
