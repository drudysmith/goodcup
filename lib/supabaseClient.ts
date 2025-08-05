import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Client-side Supabase client for anon operations
export const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client with service role
// Only create when accessed on server-side
export const getSupabaseServiceRole = (): SupabaseClient => {
  if (typeof window !== 'undefined') {
    throw new Error('Server client should not be used on client-side');
  }
  
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Legacy export for backward compatibility - will be lazily created on server
let _supabaseServiceRole: SupabaseClient | null = null;

export const supabaseServiceRole = new Proxy({}, {
  get(target, prop) {
    if (typeof window !== 'undefined') {
      throw new Error('Server client should not be used on client-side');
    }
    if (!_supabaseServiceRole) {
      _supabaseServiceRole = getSupabaseServiceRole();
    }
    return (_supabaseServiceRole as any)[prop];
  }
}) as SupabaseClient; 
