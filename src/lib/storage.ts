export function buildPublicStorageUrl(bucket: string, objectPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return '';

  const normalizedBase = supabaseUrl.replace(/\/+$/, '');
  const safePath = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${normalizedBase}/storage/v1/object/public/${bucket}/${safePath}`;
}

export function normalizePublicStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes('/storage/v1/object/public/')) {
      return parsed.toString();
    }

    const segments = parsed.pathname.split('/');
    parsed.pathname = segments
      .map((segment, index) => {
        if (index === 0 || segment.length === 0) return segment;
        return encodeURIComponent(decodeURIComponent(segment));
      })
      .join('/');

    return parsed.toString();
  } catch {
    return url;
  }
}
