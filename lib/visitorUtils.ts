// Visitor UUID utilities for anonymous visitor tracking

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get visitor UUID from localStorage
 */
export function getVisitorUUID(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('visitor_uuid');
}

/**
 * Save visitor UUID to localStorage
 */
export function setVisitorUUID(uuid: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('visitor_uuid', uuid);
}

/**
 * Check if visitor is new (no UUID in storage)
 */
export function isNewVisitor(): boolean {
  return getVisitorUUID() === null;
}

/**
 * Get visitor JWT from localStorage
 */
export function getVisitorJWT(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('supa_visitor_jwt');
}

/**
 * Save visitor JWT to localStorage
 */
export function setVisitorJWT(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('supa_visitor_jwt', token);
  console.log('💾 Storing JWT in localStorage:', `${token.slice(0, 20)}...`);
  
  // Trigger a custom event to notify components about JWT availability
  window.dispatchEvent(new CustomEvent('visitor-jwt-ready', { detail: { token } }));
}

/**
 * Check if visitor JWT is valid and not expired
 */
export function isVisitorJWTValid(): boolean {
  const jwt = getVisitorJWT();
  if (!jwt) return false;
  
  try {
    // Parse JWT payload to check expiration
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if JWT has expired
    if (payload.exp && payload.exp < currentTime) {
      console.log('⏰ Visitor JWT has expired, removing from localStorage');
      clearVisitorJWT();
      return false;
    }
    
    // Check if JWT is for the current visitor
    const currentVisitorId = getVisitorUUID();
    if (payload.visitor_id !== currentVisitorId) {
      console.log('🔄 JWT visitor ID mismatch, removing from localStorage');
      clearVisitorJWT();
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Invalid JWT format, removing from localStorage:', error);
    clearVisitorJWT();
    return false;
  }
}

/**
 * Clear visitor JWT from localStorage
 */
export function clearVisitorJWT(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('supa_visitor_jwt');
  console.log('🗑️ Cleared invalid JWT from localStorage');
}

/**
 * Generate visitor JWT by calling server API (with duplicate prevention)
 */
export async function generateVisitorJWT(visitorId: string): Promise<string | null> {
  // Guard: Check if we already have a valid JWT for this visitor
  if (isVisitorJWTValid()) {
    const existingJWT = getVisitorJWT();
    console.log('✅ Valid JWT already exists, skipping generation:', `${existingJWT!.slice(0, 20)}...`);
    return existingJWT;
  }

  try {
    console.log('🔑 Generating JWT for visitor:', visitorId);
    
    const response = await fetch('/api/create-visitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visitorId }),
    });

    if (!response.ok) {
      throw new Error(`JWT generation failed: ${response.status}`);
    }

    const { token } = await response.json();
    
    console.log('✅ Received token from server:', `${token.slice(0, 20)}...`);
    
    // Store in localStorage
    setVisitorJWT(token);
    
    return token;
  } catch (error) {
    console.error('❌ Failed to generate visitor JWT:', error);
    return null;
  }
} 