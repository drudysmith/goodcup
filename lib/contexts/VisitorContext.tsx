import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
console.log('>> initializing visitor context');
interface VisitorData {
  name: string | null;
  email: string | null;
  phone: string | null;
  cart: object | null;
}

interface VisitorContextType {
  visitorId: string | null;
  jwt: string | null;
  visitorData: VisitorData | null;
  isReady: boolean;
}

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

interface VisitorProviderProps {
  children: ReactNode;
}

export const VisitorProvider: React.FC<VisitorProviderProps> = ({ children }) => {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
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

      // Handle JWT authentication flow
      if (currentVisitorId && !existingJwt) {
        // Module 2: Registration flow - New visitor needs JWT
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
      } else if (currentVisitorId && existingJwt) {
        // Module 3: Validation flow - Returning visitor with JWT
        console.log('🔁 Found visitor_id + JWT in localStorage — verifying with backend');
        
        try {
          const response = await fetch('/api/visitor/validate', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${existingJwt}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Valid JWT — visitor authed');
            
            // Hydrate app with contact info, cart, etc.
            setJwt(existingJwt);
            setVisitorData({
              name: data.visitor.name,
              email: data.visitor.email,
              phone: data.visitor.phone,
              cart: data.visitor.cart
            });
          } else {
            // Invalid JWT - clear and restart
            console.log('⚠️ Invalid JWT — clearing localStorage, restarting auth');
            localStorage.removeItem('visitor_id');
            localStorage.removeItem('visitor_jwt');
            
            // Generate new visitor and restart flow
            const newVisitorId = uuidv4();
            console.log('🆕 Restarting with new visitor_id:', newVisitorId);
            localStorage.setItem('visitor_id', newVisitorId);
            console.log('💾 Stored new visitor_id to localStorage:', newVisitorId);
            setVisitorId(newVisitorId);
            currentVisitorId = newVisitorId;
            
            // This will trigger Module 2 flow on next effect run
            window.location.reload();
          }
        } catch (error) {
          console.error('Error validating visitor:', error);
          // On network error, proceed with existing JWT (offline capability)
          setJwt(existingJwt);
        }
      } else if (!currentVisitorId && existingJwt) {
        // Edge case: JWT without visitor_id (shouldn't happen, but clean up)
        console.log('⚠️ Found JWT without visitor_id - cleaning up localStorage');
        localStorage.removeItem('visitor_jwt');
      }
      
      setIsReady(true);
    };

    initializeVisitor();
  }, []);

  return (
    <VisitorContext.Provider value={{ visitorId, jwt, visitorData, isReady }}>
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
    visitorData: context.visitorData ? { 
      hasName: !!context.visitorData.name,
      hasEmail: !!context.visitorData.email, 
      hasPhone: !!context.visitorData.phone,
      hasCart: !!context.visitorData.cart 
    } : null,
    isReady: context.isReady
  });
  
  return context;
}; 