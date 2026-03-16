/**
 * Server-side only: resolves a Google Maps URL to normalized place data.
 * Never call this from the browser — it uses GOOGLE_PLACES_API_KEY.
 */

export interface ResolvedPlace {
  externalPlaceId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  priceLevel: number | null;
  editorialSummary: string | null;
  metadataJson: Record<string, unknown>;
  reviews: ResolvedReview[];
}

export interface ResolvedReview {
  authorName: string | null;
  rating: number | null;
  text: string | null;
  publishedAt: string | null;
  sourceProvider: string;
  rawJson: Record<string, unknown>;
}

// -------------------------------------------------------
// URL → place_id extraction
// -------------------------------------------------------

/**
 * Attempts to extract a Google place_id directly from a URL.
 * Handles patterns like:
 *   maps.google.com/maps/place/...?...&place_id=ChIJ...
 *   maps.google.com/maps/place/Name/data=...!4s<place_id>
 */
export function extractPlaceIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Check query param
    const qp = parsed.searchParams.get('place_id');
    if (qp) return qp;

    // Check data parameter for embedded place_id (!4s<id>)
    const data = parsed.searchParams.get('data');
    if (data) {
      const match = data.match(/!4s(ChIJ[A-Za-z0-9_-]+)/);
      if (match) return match[1];
    }

    // maps.google.com/maps/place/Name/@lat,lng,z/data=...
    // Sometimes place_id is in the path after the place name segment
    const pathMatch = parsed.pathname.match(/\/maps\/place\/[^/]+\/([^/]+)/);
    if (pathMatch) {
      const segment = pathMatch[1];
      if (segment.startsWith('ChIJ')) return segment;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validates that the URL is from a supported Google Maps host.
 */
export function isGoogleMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'maps.google.com' ||
      parsed.hostname === 'www.google.com' ||
      parsed.hostname === 'google.com' ||
      parsed.hostname === 'maps.app.goo.gl' ||
      parsed.hostname === 'goo.gl'
    );
  } catch {
    return false;
  }
}

// -------------------------------------------------------
// Short URL expansion
// -------------------------------------------------------

async function expandShortUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'HEAD',
    redirect: 'follow',
  });
  return response.url || url;
}

// -------------------------------------------------------
// Google Places API call with exponential backoff
// -------------------------------------------------------

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

async function fetchWithBackoff(
  url: string,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429 || res.status >= 500) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((r) => setTimeout(r, delay));
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const delay = Math.pow(2, attempt) * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

// -------------------------------------------------------
// Resolve a place_id via Place Details API
// -------------------------------------------------------

async function fetchPlaceDetails(placeId: string): Promise<ResolvedPlace> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const fields = [
    'name',
    'formatted_address',
    'geometry/location',
    'place_id',
    'rating',
    'price_level',
    'editorial_summary',
    'reviews',
  ].join(',');

  const url = `${PLACES_API_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(fields)}&key=${apiKey}`;

  const start = Date.now();
  const res = await fetchWithBackoff(url);

  if (!res.ok) {
    throw new Error(`Places API HTTP error: ${res.status}`);
  }

  const json = await res.json();
  const latency = Date.now() - start;
  console.log('[places/resolve]', { placeId, status: json.status, latency });

  if (json.status === 'REQUEST_DENIED') {
    throw new Error('Google Places API request denied — check API key');
  }

  if (json.status === 'OVER_QUERY_LIMIT') {
    throw new Error('rate_limited');
  }

  if (json.status !== 'OK') {
    throw new Error(`invalid_place: ${json.status}`);
  }

  const result = json.result ?? {};

  // Pick top 3 reviews: highest rated, non-empty text
  const rawReviews: Array<Record<string, unknown>> = Array.isArray(result.reviews)
    ? result.reviews
    : [];

  const topReviews = rawReviews
    .filter((r) => typeof r.text === 'string' && r.text.trim().length > 0)
    .sort((a, b) => ((b.rating as number) ?? 0) - ((a.rating as number) ?? 0))
    .slice(0, 3);

  const reviews: ResolvedReview[] = topReviews.map((r) => ({
    authorName: typeof r.author_name === 'string' ? r.author_name : null,
    rating: typeof r.rating === 'number' ? r.rating : null,
    text: typeof r.text === 'string' ? r.text : null,
    publishedAt:
      typeof r.time === 'number'
        ? new Date(r.time * 1000).toISOString()
        : null,
    sourceProvider: 'google',
    rawJson: r as Record<string, unknown>,
  }));

  return {
    externalPlaceId: result.place_id ?? placeId,
    name: result.name ?? '',
    address: result.formatted_address ?? null,
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    rating: typeof result.rating === 'number' ? result.rating : null,
    priceLevel:
      typeof result.price_level === 'number' ? result.price_level : null,
    editorialSummary: result.editorial_summary?.overview ?? null,
    metadataJson: result as Record<string, unknown>,
    reviews,
  };
}

// -------------------------------------------------------
// Resolve a place_id from a text search (fallback)
// -------------------------------------------------------

async function findPlaceIdByQuery(query: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = `${PLACES_API_BASE}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${apiKey}`;

  try {
    const res = await fetchWithBackoff(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'OK') return null;
    return json.candidates?.[0]?.place_id ?? null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// Main resolve function
// -------------------------------------------------------

export async function resolveGoogleMapsUrl(
  rawUrl: string
): Promise<ResolvedPlace> {
  if (!isGoogleMapsUrl(rawUrl)) {
    throw new Error('invalid_url: not a Google Maps URL');
  }

  // Expand short URLs (maps.app.goo.gl, goo.gl)
  let url = rawUrl;
  const parsed = new URL(url);
  if (
    parsed.hostname === 'maps.app.goo.gl' ||
    parsed.hostname === 'goo.gl'
  ) {
    url = await expandShortUrl(url);
  }

  // Try to extract place_id directly
  let placeId = extractPlaceIdFromUrl(url);

  // Fallback: use the place name from the URL path as a text search
  if (!placeId) {
    try {
      const p = new URL(url);
      const pathParts = p.pathname.split('/');
      const placeIndex = pathParts.indexOf('place');
      if (placeIndex !== -1 && pathParts[placeIndex + 1]) {
        const placeName = decodeURIComponent(
          pathParts[placeIndex + 1].replace(/\+/g, ' ')
        );
        placeId = await findPlaceIdByQuery(placeName);
      }
    } catch {
      // ignore
    }
  }

  if (!placeId) {
    throw new Error('invalid_place: could not extract place_id from URL');
  }

  return fetchPlaceDetails(placeId);
}
