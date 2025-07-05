import { useQuery } from '@tanstack/react-query';

// Types for Stripe data
interface StripeOrder {
  id: string;
  stripe_payment_intent_id: string;
  created_at: string;
  amount: number;
}

interface StripeSubscription {
  id: string;
  stripe_subscription_id: string;
  created_at: string;
  current_period_end?: string;
  canceled_at?: string;
  amount: number;
  status: string;
}

// SMU 4.1: Helper to fetch orders from Stripe
export const fetchOrders = async (customerId?: string): Promise<StripeOrder[]> => {
  // If no customerId provided, return placeholder data
  if (!customerId) {
    return [
      { 
        id: 'order_1', 
        stripe_payment_intent_id: 'pi_ABC12345', 
        created_at: new Date().toISOString(), 
        amount: 1999 
      },
      { 
        id: 'order_2', 
        stripe_payment_intent_id: 'pi_DEF67890', 
        created_at: new Date().toISOString(), 
        amount: 2999 
      },
    ];
  }

  try {
    const response = await fetch(`/api/getOrders?customerId=${customerId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching orders from Stripe:', error);
    // Return placeholder data on error
    return [
      { 
        id: 'order_1', 
        stripe_payment_intent_id: 'pi_ABC12345', 
        created_at: new Date().toISOString(), 
        amount: 1999 
      },
      { 
        id: 'order_2', 
        stripe_payment_intent_id: 'pi_DEF67890', 
        created_at: new Date().toISOString(), 
        amount: 2999 
      },
    ];
  }
};

// SMU 4.1: Helper to fetch subscriptions from Stripe
export const fetchSubscriptions = async (customerId?: string): Promise<StripeSubscription[]> => {
  // If no customerId provided, return placeholder data
  if (!customerId) {
    return [
      { 
        id: 'sub_1', 
        stripe_subscription_id: 'sub_12345678', 
        created_at: new Date().toISOString(), 
        current_period_end: new Date().toISOString(), 
        amount: 999, 
        status: 'active' 
      },
      { 
        id: 'sub_2', 
        stripe_subscription_id: 'sub_87654321', 
        created_at: new Date().toISOString(), 
        canceled_at: new Date().toISOString(), 
        amount: 1499, 
        status: 'canceled' 
      },
    ];
  }

  try {
    const response = await fetch(`/api/getSubscriptions?customerId=${customerId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch subscriptions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching subscriptions from Stripe:', error);
    // Return placeholder data on error
    return [
      { 
        id: 'sub_1', 
        stripe_subscription_id: 'sub_12345678', 
        created_at: new Date().toISOString(), 
        current_period_end: new Date().toISOString(), 
        amount: 999, 
        status: 'active' 
      },
      { 
        id: 'sub_2', 
        stripe_subscription_id: 'sub_87654321', 
        created_at: new Date().toISOString(), 
        canceled_at: new Date().toISOString(), 
        amount: 1499, 
        status: 'canceled' 
      },
    ];
  }
};

// TanStack Query hooks for orders and subscriptions
export const useOrders = (customerId?: string) => {
  return useQuery({
    queryKey: ['orders', customerId],
    queryFn: () => fetchOrders(customerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useSubscriptions = (customerId?: string) => {
  return useQuery({
    queryKey: ['subscriptions', customerId],
    queryFn: () => fetchSubscriptions(customerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}; 