import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Returns the current session user, or null if not authenticated.
 */
export const getSession = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    const status = typeof error === 'object' && error && 'status' in error ? error.status : null;
    if (status === 429) {
      const { data: sessionData } = await supabase.auth.getSession();
      return sessionData.session?.user ?? null;
    }
    return null;
  }

  return data.user;
});

/**
 * Returns the current session user. Redirects to /sign-in if not authenticated.
 */
export async function requireSession(): Promise<User> {
  const user = await getSession();
  if (!user) {
    redirect('/sign-in');
  }
  return user;
}
