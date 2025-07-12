import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useSupabaseSession } from '../queries/sessionQueries';
import { useVisitor } from '../contexts/VisitorContext';
import { LOG_ENABLED } from '../utils/log';

interface VisitorMergeState {
  isLoading: boolean;
  error: string | null;
  triggerMerge: () => void;
}

// Bug Module 6B: useVisitorMerge Hook
export const useVisitorMerge = (): VisitorMergeState => {
  const queryClient = useQueryClient();
  const sessionQuery = useSupabaseSession();
  const { visitorId, updateVisitorIdentity } = useVisitor();

  // Visitor merge mutation
  const visitorMergeMutation = useMutation({
    mutationFn: async () => {
      if (LOG_ENABLED) {
      console.log('🧩 Bug 6B: Visitor merge triggered by session');
      }

      if (!visitorId) {
        throw new Error('No visitor ID available for merge');
      }

      const session = sessionQuery.data;
      if (!session) {
        throw new Error('No active session for merge');
      }

      const response = await fetch('/api/visitor/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ visitor_id: visitorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to merge visitor with user account');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (LOG_ENABLED) {
      console.log('✅ Bug 6B: Visitor merge successful:', data);
      }
      
      // Update visitor identity with merged data
      if (data.visitor_id && data.jwt) {
        updateVisitorIdentity(data.visitor_id, data.jwt, {
          name: data.visitor?.name || null,
          email: data.visitor?.email || null,
          phone: data.visitor?.phone || null,
          cart: data.visitor?.cart || null,
          street: data.visitor?.street || null,
          unit: data.visitor?.unit || null,
          city: data.visitor?.city || null,
          state: data.visitor?.state || null,
          postal_code: data.visitor?.postal_code || null,
          country: data.visitor?.country || null,
          has_account: true, // User now has account after merge
        });
      }

      // Remove old visitor tokens from localStorage (if different from merged)
      if (data.merged && data.visitor_id !== visitorId) {
        localStorage.removeItem('visitor_jwt');
        if (LOG_ENABLED) {
        console.log('🧹 Bug 6B: Removed old visitor tokens from localStorage');
        }
      }

      // Invalidate visitor query to refresh with merged data
      queryClient.invalidateQueries({ queryKey: ['visitor'], exact: false });
    },
    onError: (error) => {
      if (LOG_ENABLED) {
      console.error('❌ Bug 6B: Visitor merge failed:', error);
      }
    },
  });

  const triggerMerge = useCallback(() => {
    // Only trigger merge if there's an active session
    if (sessionQuery.data && visitorId) {
      visitorMergeMutation.mutate();
    } else {
      if (LOG_ENABLED) {
      console.warn('⚠️ Bug 6B: Cannot trigger merge - no active session or visitor ID');
      }
    }
  }, [sessionQuery.data, visitorId, visitorMergeMutation]);

  return useMemo(() => ({
    isLoading: visitorMergeMutation.isPending,
    error: visitorMergeMutation.error?.message || null,
    triggerMerge,
  }), [visitorMergeMutation.isPending, visitorMergeMutation.error?.message, triggerMerge]);
}; 