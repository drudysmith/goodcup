import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { generateUUID, getVisitorUUID, setVisitorUUID, isNewVisitor, generateVisitorJWT, isVisitorJWTValid } from '../visitorUtils';

interface CreateVisitorResponse {
  success: boolean;
  visitor: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    cart: object;
    last_updated: string;
  };
}

/**
 * Creates a new visitor record in the database
 */
async function createVisitor(visitorUuid: string): Promise<CreateVisitorResponse> {
  const response = await fetch('/api/visitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visitor_uuid: visitorUuid }),
  });

  if (!response.ok) {
    throw new Error('Failed to create visitor record');
  }
  
  return response.json();
}

/**
 * Custom hook for visitor tracking
 * Automatically creates a visitor record for new visitors on first site load
 */
export function useVisitorTracking() {
  const hasInitialized = useRef(false);
  
  const createVisitorMutation = useMutation({
    mutationFn: createVisitor,
    onSuccess: async (data) => {
      console.log('👤 New visitor successfully inserted into database:', data.visitor.id);
      // Generate JWT for the new visitor
      await generateVisitorJWT(data.visitor.id);
    },
    onError: (error) => {
      console.error('❌ Failed to create visitor in database:', error);
    },
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Prevent duplicate initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check if visitor is new
    if (isNewVisitor()) {
      console.log('🆕 New visitor identified - no UUID found in localStorage');
      
      // Generate new UUID and save to localStorage
      const newUuid = generateUUID();
      console.log('🔑 Created new UUID for new visitor:', newUuid);
      setVisitorUUID(newUuid);
      
      // Create visitor record in database
      createVisitorMutation.mutate(newUuid);
    } else {
      const existingUuid = getVisitorUUID();
      console.log('🔄 Returning visitor recognized with UUID:', existingUuid);
      
      // Only generate JWT for returning visitor if they don't have a valid one
      if (existingUuid && !isVisitorJWTValid()) {
        console.log('🔑 Returning visitor needs JWT generation');
        generateVisitorJWT(existingUuid);
      } else if (existingUuid && isVisitorJWTValid()) {
        console.log('✅ Returning visitor already has valid JWT');
      }
    }
  }, []);

  const visitorUuid = getVisitorUUID();
  const isVisitorReady = visitorUuid && !createVisitorMutation.isPending && !createVisitorMutation.error;

  return {
    visitorUuid,
    isNewVisitor: isNewVisitor(),
    isCreatingVisitor: createVisitorMutation.isPending,
    createVisitorError: createVisitorMutation.error,
    isVisitorReady: Boolean(isVisitorReady),
  };
} 