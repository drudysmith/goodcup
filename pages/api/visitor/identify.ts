import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { supabaseServiceRole } from '../../../lib/supabaseClient';

interface IdentifyVisitorRequest {
  visitor_id: string;
  email: string;
  phone?: string;
  name?: string;
}

interface IdentifyVisitorResponse {
  visitor_id: string;
  jwt: string;
  visitor: {
    name: string | null;
    email: string | null;
    phone: string | null;
    cart: any;
    street: string | null;
    unit: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
  merged: boolean;
  has_account: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitor_id, email, phone, name }: IdentifyVisitorRequest = req.body;

    if (!visitor_id || !email) {
      return res.status(400).json({ error: 'visitor_id and email are required' });
    }

    // Search for existing visitors with this email
    const { data: existingVisitors, error: searchError } = await supabaseServiceRole
      .from('visitors')
      .select('id, email, phone, name, cart, user_id')
      .eq('email', email);

    if (searchError) {
      return res.status(500).json({ error: 'Error searching for existing visitors' });
    }

    let targetVisitorId = visitor_id;
    let merged = false;
    let hasAccount = false;

    if (existingVisitors && existingVisitors.length > 0) {
      // Found existing visitor(s) with this email
      const existingVisitor = existingVisitors[0];
      targetVisitorId = existingVisitor.id;
      merged = true;

      // Check if existing visitor has an account
      hasAccount = !!existingVisitor.user_id;

      // Merge cart data if both visitors have carts
      const currentCart = req.body.cart || [];
      const existingCart = existingVisitor.cart || [];

      if (currentCart.length > 0 && existingCart.length > 0) {
        // Merge carts by combining items and deduplicating by priceId
        const mergedCart = [...existingCart, ...currentCart].reduce((acc, item) => {
          const existingItem = acc.find(i => i.priceId === item.priceId);
          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            acc.push(item);
          }
          return acc;
        }, [] as any[]);

        // Update existing visitor with merged cart and contact info
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update({
            cart: mergedCart,
            phone: phone || existingVisitor.phone,
            name: name || existingVisitor.name
          })
          .eq('id', existingVisitor.id);

        if (updateError) {
          return res.status(500).json({ error: 'Error updating existing visitor' });
        }

        // Delete the current visitor record since we merged into the existing one
        if (visitor_id !== existingVisitor.id) {
          const { error: deleteError } = await supabaseServiceRole
            .from('visitors')
            .delete()
            .eq('id', visitor_id);

          if (deleteError) {
            return res.status(500).json({ error: 'Error deleting old visitor record' });
          }
        }
      } else {
        // Update existing visitor with contact info only
        const { error: updateError } = await supabaseServiceRole
          .from('visitors')
          .update({
            phone: phone || existingVisitor.phone,
            name: name || existingVisitor.name
          })
          .eq('id', existingVisitor.id);

        if (updateError) {
          return res.status(500).json({ error: 'Error updating visitor' });
        }
      }
    } else {
      // No existing visitor found, update current visitor with contact info
      const { error: updateError } = await supabaseServiceRole
        .from('visitors')
        .update({
          email,
          phone,
          name
        })
        .eq('id', visitor_id);

      if (updateError) {
        return res.status(500).json({ error: 'Error updating visitor' });
      }
    }

    // Generate new JWT for the target visitor
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const token = jwt.sign(
      { 
        visitor_id: targetVisitorId,
        type: 'visitor',
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // Fetch final visitor data
    const { data: finalVisitorData, error: fetchError } = await supabaseServiceRole
      .from('visitors')
      .select('name, email, phone, cart, street, unit, city, state, postal_code, country')
      .eq('id', targetVisitorId)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: 'Error fetching updated visitor' });
    }

    const response: IdentifyVisitorResponse = {
      visitor_id: targetVisitorId,
      jwt: token,
      visitor: {
        name: finalVisitorData?.name || null,
        email: finalVisitorData?.email || null,
        phone: finalVisitorData?.phone || null,
        cart: finalVisitorData?.cart || null,
        street: finalVisitorData?.street || null,
        unit: finalVisitorData?.unit || null,
        city: finalVisitorData?.city || null,
        state: finalVisitorData?.state || null,
        postal_code: finalVisitorData?.postal_code || null,
        country: finalVisitorData?.country || null
      },
      merged,
      has_account: hasAccount
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 