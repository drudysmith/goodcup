import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
console.log('>> initializing visitor context');
interface VisitorContextType {
  visitorId: string | null;
  jwt: string | null;
  isReady: boolean;
}
//git test
const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

interface VisitorProviderProps {
  children: ReactNode;
}

export const VisitorProvider: React.FC<VisitorProviderProps> = ({ children }) => {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeVisitor = async () => {
      // Check localStorage for existing visitor_id and JWT
      const existingVisitorId = localStorage.getItem('visitor_id');
      const existingJwt = localStorage.getItem('visitor_jwt');
      
      let currentVisitorId = existingVisitorId;
      
      if (existingVisitorId) {
        console.log('✅ Found existing visitor_id in localStorage:', existingVisitorId);
        setVisitorId(existingVisitorId);
      } else {
        // Generate new UUID and store it in localStorage
        const newVisitorId = uuidv4();
        console.log('🆕 No visitor_id found in storage — generated new one:', newVisitorId);
        localStorage.setItem('visitor_id', newVisitorId);
        console.log('💾 Stored new visitor_id to localStorage:', newVisitorId);
        setVisitorId(newVisitorId);
        currentVisitorId = newVisitorId;
      }

      // Handle JWT - only register if visitor_id exists but no JWT
      console.log('🔍 JWT decision check:', {
        hasVisitorId: !!currentVisitorId,
        hasExistingJwt: !!existingJwt,
        willRegister: !!(currentVisitorId && !existingJwt)
      });
      
      if (currentVisitorId && !existingJwt) {
        try {
          console.log('📡 Sending visitor_id to backend for registration:', currentVisitorId);
          
          const response = await fetch('/api/visitor/init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ visitor_id: currentVisitorId }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Visitor registered — JWT received');
            
            localStorage.setItem('visitor_jwt', data.jwt);
            console.log('💾 Stored visitor_jwt in localStorage');
            
            setJwt(data.jwt);
          } else {
            console.error('Failed to register visitor:', response.status);
          }
        } catch (error) {
          console.error('Error registering visitor:', error);
        }
      } else if (existingJwt) {
        console.log('✅ Found existing JWT in localStorage');
        setJwt(existingJwt);
      }
      
      setIsReady(true);
    };

    initializeVisitor();
  }, []);

  return (
    <VisitorContext.Provider value={{ visitorId, jwt, isReady }}>
      {children}
    </VisitorContext.Provider>
  );
};

export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (context === undefined) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  
  // Smart console log in the hook to show what we have
  console.log('🔍 useVisitor hook called - Current state:', {
    visitorId: context.visitorId,
    jwt: context.jwt ? '***' + context.jwt.slice(-8) : null,
    isReady: context.isReady
  });
  
  return context;
}; 