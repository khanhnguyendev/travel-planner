'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import type { Project } from '@/lib/types';

// -------------------------------------------------------
// Schemas
// -------------------------------------------------------

const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'public']).default('private'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  budgetCurrency: z.string().length(3).optional(),
});

// -------------------------------------------------------
// createProject
// -------------------------------------------------------

export async function createProject(
  title: string,
  description: string | undefined,
  visibility: 'private' | 'public',
  startDate?: string | null,
  endDate?: string | null,
  budget?: number | null,
  budgetCurrency?: string
): Promise<ActionResult<{ projectId: string }>> {
  const parsed = createProjectSchema.safeParse({
    title,
    description,
    visibility,
    startDate,
    endDate,
    budget,
    budgetCurrency,
  });

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

  // Use admin client to bypass RLS on insert (projects insert is service-role only).
  const admin = createAdminClient();

  // Ensure profile exists before creating the project (FK constraint).
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    display_name:
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'Traveler',
  });

  if (profileError) {
    console.error('Profile upsert error:', profileError);
    return { ok: false, error: 'Failed to initialize profile' };
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .insert({
      owner_user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      visibility: parsed.data.visibility,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      budget: parsed.data.budget ?? null,
      budget_currency: parsed.data.budgetCurrency ?? 'VND',
    })
    .select('id')
    .single();

  if (projectError || !project) {
    console.error('createProject error:', projectError);
    return { ok: false, error: 'Failed to create project' };
  }

  // Add the creator as an accepted owner member.
  const { error: memberError } = await admin.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'owner',
    invite_status: 'accepted',
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    console.error('project_members insert error:', memberError);
    // Project was created; still return success but log the issue.
  }

  revalidatePath('/dashboard');

  return { ok: true, data: { projectId: project.id } };
}

// -------------------------------------------------------
// updateProject
// -------------------------------------------------------

export async function updateProject(
  projectId: string,
  fields: { cover_image_url?: string | null; title?: string; description?: string | null }
): Promise<ActionResult<{ projectId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  // Verify role
  const { data: memberData } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const updatePayload: Record<string, unknown> = {};
  if ('cover_image_url' in fields) updatePayload.cover_image_url = fields.cover_image_url;
  if ('title' in fields && fields.title !== undefined) updatePayload.title = fields.title;
  if ('description' in fields) updatePayload.description = fields.description;

  const { error } = await admin
    .from('projects')
    .update(updatePayload)
    .eq('id', projectId);

  if (error) {
    console.error('updateProject error:', error);
    return { ok: false, error: 'Failed to update project' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');

  return { ok: true, data: { projectId } };
}

// -------------------------------------------------------
// updateProjectBudget
// -------------------------------------------------------

export async function updateProjectBudget(
  projectId: string,
  budget: number | null,
  budgetCurrency: string,
  payerUserId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  const { data: memberData } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const { error } = await admin
    .from('projects')
    .update({ budget, budget_currency: budgetCurrency, budget_payer_user_id: payerUserId })
    .eq('id', projectId);

  if (error) {
    console.error('updateProjectBudget error:', error);
    return { ok: false, error: 'Failed to update budget' };
  }

  revalidatePath(`/projects/${projectId}`);

  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// archiveProject
// -------------------------------------------------------

export async function archiveProject(
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Verify the user is the owner before archiving.
  const admin = createAdminClient();
  const { data: memberData } = await admin
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || member.role !== 'owner') {
    return { ok: false, error: 'Only the project owner can archive a project' };
  }

  const { error } = await admin
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId);

  if (error) {
    console.error('archiveProject error:', error);
    return { ok: false, error: 'Failed to archive project' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}`);

  return { ok: true, data: undefined };
}
