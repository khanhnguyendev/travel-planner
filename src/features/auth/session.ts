import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Returns the current session user, or null if not authenticated.
 */
export async function getSession(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

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
