import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: number;
  metadata?: any;
}

// Module B: Hook to poll for webhook events and invalidate queries
export const useWebhookSync = () => {
  const queryClient = useQueryClient();
  const lastCheckRef = useRef<number>(Date.now());

  // Poll for webhook events every 30 seconds
  const { data: webhookData } = useQuery({
    queryKey: ['webhook-events', lastCheckRef.current],
    queryFn: async () => {
      const response = await fetch(`/api/webhook-events?since=${lastCheckRef.current}`);
      if (!response.ok) {
        throw new Error('Failed to fetch webhook events');
      }
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Process webhook events and invalidate queries
  useEffect(() => {
    if (webhookData?.events?.length > 0) {
      const events = webhookData.events as WebhookEvent[];
      
      events.forEach((event) => {
        console.log(`🔄 Module B: Processing webhook event: ${event.type}`);
        
        if (event.type === 'checkout.session.completed') {
          console.log('📦 Module B: Invalidating orders and subscriptions queries');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        } else if (
          event.type.includes('subscription') || 
          event.type === 'invoice.paid'
        ) {
          console.log('📦 Module B: Invalidating subscriptions queries');
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        }
      });

      // Update last check timestamp to the latest event
      const latestTimestamp = Math.max(...events.map(e => e.timestamp));
      lastCheckRef.current = latestTimestamp;
    }
  }, [webhookData, queryClient]);

  return {
    isPolling: true,
    lastEventCount: webhookData?.events?.length || 0,
  };
}; 