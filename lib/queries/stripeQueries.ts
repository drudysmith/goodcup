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
export const fetchOrders = async (): Promise<StripeOrder[]> => {
  // For now, return placeholder data matching dashboard format
  // This will be replaced with actual Stripe API calls when needed
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
};

// SMU 4.1: Helper to fetch subscriptions from Stripe
export const fetchSubscriptions = async (): Promise<StripeSubscription[]> => {
  // For now, return placeholder data matching dashboard format
  // This will be replaced with actual Stripe API calls when needed
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
};

// TanStack Query hooks for orders and subscriptions
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useSubscriptions = () => {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}; 