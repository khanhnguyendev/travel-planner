'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import type { Category, CategoryType } from '@/lib/types';

// -------------------------------------------------------
// Schemas
// -------------------------------------------------------

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
});

// -------------------------------------------------------
// createCategory
// -------------------------------------------------------

export async function createCategory(
  tripId: string,
  name: string,
  color?: string | null,
  icon?: string | null,
  sortOrder?: number | null,
  categoryType?: CategoryType
): Promise<ActionResult<{ category: Category }>> {
  const parsed = createCategorySchema.safeParse({ name, color, icon, sortOrder });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('categories')
    .insert({
      trip_id: tripId,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      icon: parsed.data.icon ?? null,
      sort_order: parsed.data.sortOrder ?? null,
      category_type: categoryType ?? 'general',
    })
    .select('*')
    .single();

  if (error) {
    console.error('createCategory error:', error);
    if (error.code === '23505') {
      return { ok: false, error: 'A category with this name already exists' };
    }
    return { ok: false, error: 'Failed to create category' };
  }

  revalidatePath(`/trips/${tripId}`);

  return { ok: true, data: { category: data as Category } };
}

// -------------------------------------------------------
// updateCategory
// -------------------------------------------------------

export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    color?: string | null;
    icon?: string | null;
    sortOrder?: number | null;
  }
): Promise<ActionResult<{ category: Category }>> {
  const parsed = updateCategorySchema.safeParse(updates);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if ('color' in parsed.data) updateData.color = parsed.data.color ?? null;
  if ('icon' in parsed.data) updateData.icon = parsed.data.icon ?? null;
  if ('sortOrder' in parsed.data) updateData.sort_order = parsed.data.sortOrder ?? null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('updateCategory error:', error);
    if (error.code === '23505') {
      return { ok: false, error: 'A category with this name already exists' };
    }
    return { ok: false, error: 'Failed to update category' };
  }

  revalidatePath(`/trips/${(data as Category).trip_id}`);

  return { ok: true, data: { category: data as Category } };
}

// -------------------------------------------------------
// ensureAccommodationCategory
// -------------------------------------------------------

/**
 * Returns the first accommodation-type category for the trip,
 * creating one if none exists. Used by the accommodation toggle in the add-place form.
 */
export async function ensureAccommodationCategory(
  tripId: string
): Promise<ActionResult<{ category: Category }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // Find existing accommodation category
  const { data: existing } = await admin
    .from('categories')
    .select('*')
    .eq('trip_id', tripId)
    .eq('category_type', 'accommodation')
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { ok: true, data: { category: existing as Category } };
  }

  // Create one
  const { data, error } = await admin
    .from('categories')
    .insert({
      trip_id: tripId,
      name: 'Accommodation',
      icon: '🏨',
      color: null,
      sort_order: null,
      category_type: 'accommodation',
    })
    .select('*')
    .single();

  if (error) {
    console.error('ensureAccommodationCategory error:', error);
    return { ok: false, error: 'Failed to create accommodation category' };
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: { category: data as Category } };
}

// -------------------------------------------------------
// deleteCategory
// -------------------------------------------------------

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Fetch the category first to get trip_id for revalidation.
  const { data: categoryData } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  const category = categoryData as { trip_id: string } | null;

  const admin = createAdminClient();
  const { error } = await admin.from('categories').delete().eq('id', id);

  if (error) {
    console.error('deleteCategory error:', error);
    return { ok: false, error: 'Failed to delete category' };
  }

  if (category) {
    revalidatePath(`/trips/${category.trip_id}`);
  }

  return { ok: true, data: undefined };
}
