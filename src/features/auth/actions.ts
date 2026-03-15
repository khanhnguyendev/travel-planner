'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// -------------------------------------------------------
// Schemas
// -------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(80),
});

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// -------------------------------------------------------
// signIn
// -------------------------------------------------------

export async function signIn(
  email: string,
  password: string
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

// -------------------------------------------------------
// signUp
// -------------------------------------------------------

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({ email, password, displayName });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Upsert a profile row immediately if the user was auto-confirmed.
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      display_name: parsed.data.displayName,
    });
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

// -------------------------------------------------------
// signOut
// -------------------------------------------------------

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
