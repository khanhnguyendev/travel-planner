'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeNextPath } from '@/features/auth/redirects';

/**
 * Initiates Google OAuth sign-in flow.
 * Redirects the browser to the Google consent screen.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const nextPath = normalizeNextPath(formData.get('next')?.toString());

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error || !data.url) {
    redirect('/sign-in?error=oauth_failed');
  }

  redirect(data.url);
}
