/**
 * Browser-only anon Supabase client used exclusively by `/sesepay` persistence.
 * Same env as the rest of the app, but no import from `lib/supabaseClient.ts` so this
 * feature stays isolated from shared auth/visitor wiring.
 */
import { createClient } from '@supabase/supabase-js';

export const supabaseSesepayAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
