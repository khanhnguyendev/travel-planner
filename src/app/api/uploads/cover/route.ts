import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectMember } from '@/lib/types';

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const postCoverSchema = z.object({
  projectId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
});

// POST /api/uploads/cover
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse('forbidden', 'Not authenticated', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid', 'Invalid JSON body', 400);
  }

  const parsed = postCoverSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { projectId, filename } = parsed.data;

  // Validate caller role (owner/admin only for cover images)
  const { data: callerMemberData } = await supabase
    .from('project_members')
    .select('role, invite_status')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerMember = callerMemberData as Pick<ProjectMember, 'role' | 'invite_status'> | null;
  if (!callerMember) {
    return errorResponse('forbidden', 'Not a member of this project', 403);
  }

  if (!['owner', 'admin'].includes(callerMember.role)) {
    return errorResponse('forbidden', 'Only owner or admin can update cover image', 403);
  }

  // Sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const coverPath = `project/${projectId}/cover/${safeName}`;

  const admin = createAdminClient();

  const { data: signedData, error: signedError } = await admin.storage
    .from('covers')
    .createSignedUploadUrl(coverPath, { upsert: true });

  if (signedError || !signedData) {
    console.error('createSignedUploadUrl error:', signedError);
    return errorResponse('server_error', 'Failed to generate upload URL', 500);
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  return NextResponse.json({
    ok: true,
    data: {
      uploadUrl: signedData.signedUrl,
      coverPath,
      expiresAt,
    },
  });
}
