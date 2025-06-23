import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getVisitorJWT } from './visitorUtils';

// Server-side Supabase client (JWT-based RLS)
let serverSupabaseInstance: SupabaseClient | null = null;

export function getServerSupabaseClient(): SupabaseClient {
  if (!serverSupabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    console.log('✅ Server: Creating singleton Supabase client with service role key');
    serverSupabaseInstance = createClient(supabaseUrl, supabaseKey);
  }

  return serverSupabaseInstance;
}

// Client-side Supabase singleton
let clientSupabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientSupabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    console.log('✅ Client: Creating singleton Supabase client');
    clientSupabaseInstance = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          // JWT will be added dynamically in database operations
        }
      }
    });
  }

  return clientSupabaseInstance;
}

// Get Supabase client with proper JWT headers for database operations
export function getSupabaseClientWithAuth(): SupabaseClient {
  const client = getSupabaseClient();
  const jwt = getVisitorJWT();
  
  if (jwt) {
    // Create a new client instance with JWT header for this specific operation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      }
    });
  }
  
  return client;
}

// Update auth token on existing singleton client
export async function updateSupabaseAuth(): Promise<void> {
  const client = getSupabaseClient();
  const jwt = getVisitorJWT();

  if (jwt) {
    // Check if this is an anonymous JWT (contains visitor_id in payload)
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      if (payload.visitor_id && payload.role === 'anon') {
        console.log('🔐 Anonymous JWT detected - skipping setSession to prevent 403');
        // Store JWT for RLS queries but don't set as auth session
        // The JWT is already included in headers via the singleton client
        return;
      }
    } catch (parseError) {
      console.warn('Could not parse JWT payload:', parseError);
    }

    // Only set auth session for real Supabase JWTs
    try {
      await client.auth.setSession({
        access_token: jwt,
        refresh_token: jwt
      });
      console.log('🔐 Auth token updated on singleton client:', `${jwt.slice(0, 20)}...`);
    } catch (error: any) {
      // Silently handle auth errors for anonymous JWTs
      if (error.status === 403 || error.message?.includes('403')) {
        console.log('⚠️ Auth session not compatible with anonymous JWT (expected)');
      } else {
        console.warn('Auth session update failed:', error);
      }
    }
  } else {
    console.log('⏳ No JWT available for auth update');
  }
}

// Check if user has real Supabase auth session (not anonymous JWT)
export async function hasRealAuthSession(): Promise<boolean> {
  try {
    const jwt = getVisitorJWT();
    if (!jwt) return false;
    
    // Parse JWT to check if it's anonymous
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    
    // If JWT contains visitor_id and role is 'anon', it's not a real auth session
    if (payload.visitor_id && payload.role === 'anon') {
      return false;
    }
    
    // If JWT has real user data (email, etc.), it's a real auth session
    return !!payload.email && !!payload.sub;
  } catch (error) {
    // Any error means no real auth session
    return false;
  }
}

// Safe wrapper for auth operations that require real auth session
export async function withRealAuth<T>(
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T | null> {
  const hasAuth = await hasRealAuthSession();
  
  if (hasAuth) {
    try {
      return await operation();
    } catch (error) {
      console.warn('Auth operation failed:', error);
      return fallback ? fallback() : null;
    }
  } else {
    console.log('⚠️ Skipping auth operation - using anonymous JWT');
    return fallback ? fallback() : null;
  }
} 