import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Exchange the auth code for a session after OAuth or magic-link flows.
 * Also syncs the user's avatar_url and display_name from OAuth metadata into profiles.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};
      const avatarUrl: string | null =
        meta.avatar_url ?? meta.picture ?? null;
      const displayName: string | null =
        meta.full_name ?? meta.name ?? meta.display_name ?? null;

      // Upsert profile so avatar_url and display_name stay in sync after OAuth.
      const admin = createAdminClient();
      await admin.from('profiles').upsert(
        {
          id: data.user.id,
          ...(avatarUrl && { avatar_url: avatarUrl }),
          ...(displayName && { display_name: displayName }),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      );

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to sign-in with an error hint.
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
