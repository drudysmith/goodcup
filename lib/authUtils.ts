import { getSupabaseClient, hasRealAuthSession, withRealAuth } from './supabaseClient';

/**
 * Safely get current user only if they have a real auth session
 * Returns null for anonymous visitors using JWTs
 */
export async function getCurrentUser() {
  return await withRealAuth(async () => {
    const client = getSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      console.warn('Failed to get user:', error);
      return null;
    }
    
    return user;
  });
}

/**
 * Safely get current session only if they have a real auth session
 * Returns null for anonymous visitors using JWTs
 */
export async function getCurrentSession() {
  return await withRealAuth(async () => {
    const client = getSupabaseClient();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      console.warn('Failed to get session:', error);
      return null;
    }
    
    return session;
  });
}

/**
 * Check if current visitor is authenticated with real Supabase auth
 * (not just anonymous JWT)
 */
export async function isAuthenticated(): Promise<boolean> {
  return await hasRealAuthSession();
}

/**
 * Safe sign out - only attempts if user has real auth session
 */
export async function safeSignOut() {
  return await withRealAuth(async () => {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    
    if (error) {
      console.warn('Sign out failed:', error);
      return false;
    }
    
    console.log('✅ User signed out successfully');
    return true;
  }, () => {
    console.log('⚠️ No real auth session to sign out from');
    return false;
  });
} 