import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabaseClient } from '../../lib/supabaseClient';

export type CartItem = {
  productId: string;
  priceId: string;
  quantity: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { visitor_uuid } = req.query;

  if (!visitor_uuid || typeof visitor_uuid !== 'string') {
    return res.status(400).json({ error: 'visitor_uuid is required' });
  }

  // Get singleton Supabase client for JWT-based RLS
  const supabase = getServerSupabaseClient();

  try {
    switch (method) {
      case 'GET':
        // Get cart for visitor
        const { data: visitor, error: fetchError } = await supabase
          .from('visitors')
          .select('cart')
          .eq('id', visitor_uuid)
          .single();

        if (fetchError) {
          console.error('Failed to fetch cart:', fetchError);
          return res.status(500).json({ error: 'Failed to fetch cart' });
        }

        const cartItems = visitor?.cart?.items || [];
        return res.status(200).json({ items: cartItems });

      case 'POST':
        // Add item to cart
        const { item }: { item: CartItem } = req.body;
        
        if (!item || !item.productId || !item.priceId || !item.quantity) {
          return res.status(400).json({ error: 'Invalid item data' });
        }

        // Get current cart
        const { data: currentVisitor, error: getCurrentError } = await supabase
          .from('visitors')
          .select('cart')
          .eq('id', visitor_uuid)
          .single();

        if (getCurrentError) {
          return res.status(500).json({ error: 'Failed to get current cart' });
        }

        const currentCart = currentVisitor?.cart || { items: [] };
        const currentItems: CartItem[] = currentCart.items || [];
        
        // Check if item already exists
        const existingIndex = currentItems.findIndex(i => i.priceId === item.priceId);
        let updatedItems: CartItem[];
        
        if (existingIndex >= 0) {
          // Update quantity of existing item
          updatedItems = currentItems.map((i, index) => 
            index === existingIndex 
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        } else {
          // Add new item
          updatedItems = [...currentItems, item];
        }

        // Update cart in database
        const { data: updatedVisitor, error: updateError } = await supabase
          .from('visitors')
          .update({ 
            cart: { items: updatedItems },
            last_updated: new Date().toISOString()
          })
          .eq('id', visitor_uuid)
          .select('cart')
          .single();

        if (updateError) {
          console.error('Failed to update cart:', updateError);
          return res.status(500).json({ error: 'Failed to update cart' });
        }

        console.log(`💾 Successfully updated database with cart info for visitor ${visitor_uuid}`);
        console.log(`🛒 Cart updated for visitor ${visitor_uuid}:`, updatedItems);
        return res.status(200).json({ items: updatedVisitor.cart.items });

      case 'PUT':
        // Update item quantity
        const { priceId, quantity }: { priceId: string; quantity: number } = req.body;
        
        if (!priceId || quantity === undefined) {
          return res.status(400).json({ error: 'priceId and quantity are required' });
        }

        // Get current cart
        const { data: visitorForUpdate, error: getUpdateError } = await supabase
          .from('visitors')
          .select('cart')
          .eq('id', visitor_uuid)
          .single();

        if (getUpdateError) {
          return res.status(500).json({ error: 'Failed to get current cart' });
        }

        const cartForUpdate = visitorForUpdate?.cart || { items: [] };
        const itemsForUpdate: CartItem[] = cartForUpdate.items || [];
        
        const updatedItemsForQuantity = itemsForUpdate.map(i => 
          i.priceId === priceId ? { ...i, quantity } : i
        ).filter(i => i.quantity > 0); // Remove items with 0 quantity

        // Update cart in database
        const { data: quantityUpdatedVisitor, error: quantityUpdateError } = await supabase
          .from('visitors')
          .update({ 
            cart: { items: updatedItemsForQuantity },
            last_updated: new Date().toISOString()
          })
          .eq('id', visitor_uuid)
          .select('cart')
          .single();

        if (quantityUpdateError) {
          return res.status(500).json({ error: 'Failed to update item quantity' });
        }

        console.log(`💾 Successfully updated database with cart info for visitor ${visitor_uuid}`);
        console.log(`🛒 Cart quantity updated for visitor ${visitor_uuid}:`, updatedItemsForQuantity);
        return res.status(200).json({ items: quantityUpdatedVisitor.cart.items });

      case 'DELETE':
        // Remove item from cart or clear entire cart
        const { priceId: removeId } = req.body;

        // Get current cart
        const { data: visitorForDelete, error: getDeleteError } = await supabase
          .from('visitors')
          .select('cart')
          .eq('id', visitor_uuid)
          .single();

        if (getDeleteError) {
          return res.status(500).json({ error: 'Failed to get current cart' });
        }

        const cartForDelete = visitorForDelete?.cart || { items: [] };
        let itemsForDelete: CartItem[] = cartForDelete.items || [];
        
        if (removeId) {
          // Remove specific item
          itemsForDelete = itemsForDelete.filter(i => i.priceId !== removeId);
        } else {
          // Clear entire cart
          itemsForDelete = [];
        }

        // Update cart in database
        const { data: deleteUpdatedVisitor, error: deleteUpdateError } = await supabase
          .from('visitors')
          .update({ 
            cart: { items: itemsForDelete },
            last_updated: new Date().toISOString()
          })
          .eq('id', visitor_uuid)
          .select('cart')
          .single();

        if (deleteUpdateError) {
          return res.status(500).json({ error: 'Failed to remove item from cart' });
        }

        console.log(`💾 Successfully updated database with cart info for visitor ${visitor_uuid}`);
        console.log(`🛒 Cart item removed for visitor ${visitor_uuid}:`, itemsForDelete);
        return res.status(200).json({ items: deleteUpdatedVisitor.cart.items });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Cart API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 