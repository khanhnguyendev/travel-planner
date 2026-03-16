import { createClient } from '@/lib/supabase/server';
import type { Category } from '@/lib/types';

/**
 * Returns all categories for a project, ordered by sort_order then created_at.
 */
export async function getCategories(projectId: string): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getCategories error:', error);
    return [];
  }

  return (data ?? []) as Category[];
}

/**
 * Returns a single category by ID. RLS ensures the caller is a project member.
 */
export async function getCategory(id: string): Promise<Category | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getCategory error:', error);
    return null;
  }

  return data as Category;
}
