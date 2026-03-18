const DEFAULT_NEXT_PATH = '/dashboard';

export function normalizeNextPath(
  nextPath: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH
): string {
  if (!nextPath) return fallback;

  const candidate = nextPath.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}

export function buildSignInPath(nextPath: string | null | undefined): string {
  const normalized = normalizeNextPath(nextPath);
  if (normalized === DEFAULT_NEXT_PATH) {
    return '/sign-in';
  }

  return `/sign-in?next=${encodeURIComponent(normalized)}`;
}
