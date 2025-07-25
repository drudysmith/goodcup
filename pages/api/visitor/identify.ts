import type { NextApiRequest, NextApiResponse } from 'next';
import * as jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';
import { LOG_ENABLED } from '../../../lib/utils/log';

interface CartItem {
  priceId: string;
  quantity: number;
  [key: string]: any; // Allow additional properties
}

interface IdentifyRequest {
  visitor_id: string;
  email: string;
  phone?: string;
  name?: string;
}

interface IdentifyResponse {
  success: boolean;
  visitor_id: string;
  jwt: string;
  merged?: boolean;
  has_account?: boolean;
  visitor?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    cart: object | null;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<IdentifyResponse | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitor_id, email, phone, name } = req.body as IdentifyRequest;

    if (!visitor_id || !email) {
      return res.status(400).json({ error: 'visitor_id and email are required' });
    }

    // Step 1: Check if contact info matches an existing visitor record
    const { data: existingVisitors, error: searchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .or(`email.eq.${email}${phone ? `,phone.eq.${phone}` : ''}`)
      .neq('id', visitor_id); // Exclude current visitor from search

    if (searchError) {
      if (LOG_ENABLED) {
      console.error('Error searching for existing visitors:', searchError);
      }
      return res.status(500).json({ error: 'Database search failed' });
    }

    let targetVisitorId = visitor_id;
    let merged = false;

    if (existingVisitors && existingVisitors.length > 0) {
      // Step 2a: Match found - Merge current visitor into existing record
      const existingVisitor = existingVisitors[0]; // Take first match
      targetVisitorId = existingVisitor.id;
      merged = true;

      if (LOG_ENABLED) {
      console.log(`🔄 Merging visitor ${visitor_id} into existing record ${targetVisitorId}`);
      }

      // Get current visitor's cart data before merge
      const { data: currentVisitor } = await supabaseServiceRole
        .from('visitors')
        .select('cart')
        .eq('id', visitor_id)
        .single();

      // Merge cart data using array-based approach
      const currentCart = Array.isArray(currentVisitor?.cart) ? currentVisitor.cart : [];
      const existingCart = Array.isArray(existingVisitor.cart) ? existingVisitor.cart : [];

      // Concatenate carts and deduplicate by priceId
      const mergedCart = [...existingCart, ...currentCart].reduce<CartItem[]>((acc, item) => {
        const found = acc.find(i => i.priceId === item.priceId);
        if (found) {
          found.quantity += item.quantity;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []);

      if (LOG_ENABLED) {
      console.log(`🔄 Merged ${currentCart.length} + ${existingCart.length} cart items = ${mergedCart.length} unique items`);
      }

      // Update existing visitor record with merged data
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({
          email: email.trim(),
          phone: phone?.trim() || existingVisitor.phone,
          name: name?.trim() || existingVisitor.name,
          cart: mergedCart
        })
        .eq('id', targetVisitorId);

      if (updateError) {
        if (LOG_ENABLED) {
        console.error('Error updating existing visitor:', updateError);
        }
        return res.status(500).json({ error: 'Failed to merge visitor data' });
      }

      // Delete the old visitor record
      const { error: deleteError } = await supabaseServiceRole
        .from('visitors')
        .delete()
        .eq('id', visitor_id);

      if (deleteError) {
        if (LOG_ENABLED) {
        console.error('Error deleting old visitor record:', deleteError);
        }
        // Don't fail the request, just log the error
      }

    } else {
      // Step 2b: No match found - Update current visitor record
      if (LOG_ENABLED) {
      console.log(`📝 Enriching current visitor record ${visitor_id} with contact info`);
      }

      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({
          email: email.trim(),
          ...(phone?.trim() && { phone: phone.trim() }),
          ...(name?.trim() && { name: name.trim() })
        })
        .eq('id', visitor_id);

      if (updateError) {
        if (LOG_ENABLED) {
        console.error('Error updating visitor:', updateError);
        }
        return res.status(500).json({ error: 'Failed to update visitor data' });
      }
    }

    // Step 3: Generate new JWT for the target visitor
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const newJwt = jwt.sign(
      { visitor_id: targetVisitorId, type: 'visitor' },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // Step 4: Fetch updated visitor data
    const { data: updatedVisitor, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('*')
      .eq('id', targetVisitorId)
      .single();

    if (fetchError) {
      if (LOG_ENABLED) {
      console.error('Error fetching updated visitor:', fetchError);
      }
      return res.status(500).json({ error: 'Failed to fetch updated visitor data' });
    }

    // UxAuth 2: Check if visitor has an associated account
    const hasAccount = !!updatedVisitor.user_id;
    
    if (LOG_ENABLED) {
    console.log(`✅ Identity resolved: visitor_id=${targetVisitorId}, merged=${merged}, has_account=${hasAccount}`);
    }

    return res.status(200).json({
      success: true,
      visitor_id: targetVisitorId,
      jwt: newJwt,
      merged,
      has_account: hasAccount,
      visitor: {
        id: updatedVisitor.id,
        name: updatedVisitor.name,
        email: updatedVisitor.email,
        phone: updatedVisitor.phone,
        cart: updatedVisitor.cart
      }
    });

  } catch (error) {
    if (LOG_ENABLED) {
    console.error('Error in visitor identify:', error);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
} 