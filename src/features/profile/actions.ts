'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/features/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateProfile(displayName: string): Promise<{ error?: string }> {
  const user = await requireSession();
  const admin = createAdminClient();

  const trimmed = displayName.trim();
  if (!trimmed) return { error: 'Display name cannot be empty.' };
  if (trimmed.length > 50) return { error: 'Display name must be 50 characters or less.' };

  const { error } = await admin
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id);

  if (error) {
    console.error('updateProfile error:', error);
    return { error: 'Failed to update profile.' };
  }

  revalidatePath('/profile');
  revalidatePath('/', 'layout');
  return {};
}
