import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

// Service role client — never expose to the browser.
// Use only in server-side route handlers and server actions.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
