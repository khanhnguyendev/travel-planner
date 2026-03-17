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

    // 1. Explicit query param (rare but possible)
    const qp = parsed.searchParams.get('place_id');
    if (qp) return qp;

    // 2. Extract the data blob — in Google Maps URLs it lives in the PATH
    //    e.g. /maps/place/Name/@lat,lng/data=!3m1!...!1s<place_id>!...
    //    NOT in searchParams.
    const pathDataMatch = parsed.pathname.match(/\/data=([^?#]*)/);
    const dataBlob = pathDataMatch?.[1] ?? '';

    if (dataBlob) {
      // !1s<id> is the primary place_id token. Accepts:
      //   ChIJ...          — standard base64 place_id
      //   0x...:<0x...>    — hex CID format (common in Vietnam / Asia)
      const m = dataBlob.match(/!1s([^!]+)/);
      if (m) {
        const id = decodeURIComponent(m[1]);
        if (
          id.startsWith('ChIJ') ||
          id.startsWith('0x') ||
          id.startsWith('/g/')
        ) {
          return id;
        }
      }
    }

    // 3. Path segment directly containing a ChIJ place_id
    const pathMatch = parsed.pathname.match(/\/maps\/place\/[^/]+\/([^/]+)/);
    if (pathMatch && pathMatch[1].startsWith('ChIJ')) return pathMatch[1];

    // 4. Full-URL scan for ChIJ token (last resort)
    const fullMatch = url.match(/(?:!1s|place_id=|\/)(ChIJ[A-Za-z0-9_-]{10,})/);
    if (fullMatch) return fullMatch[1];

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
  // Use GET — many servers (including Google) don't follow HEAD redirects.
  // We don't need the body; we just want response.url after redirect chain.
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0' },
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
    console.error('[places/resolve] REQUEST_DENIED — full response:', JSON.stringify(json));
    throw new Error('Google Places API request denied — check API key and ensure Places API is enabled in Google Cloud Console');
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

async function findPlaceIdByQuery(
  query: string,
  locationBias?: { lat: number; lng: number }
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  let endpoint = `${PLACES_API_BASE}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
  if (locationBias) {
    endpoint += `&locationbias=point:${locationBias.lat},${locationBias.lng}`;
  }

  try {
    const res = await fetchWithBackoff(endpoint);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[places/resolve] findPlaceIdByQuery status:', json.status, 'candidates:', json.candidates?.length ?? 0);
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
  const log = (...args: unknown[]) =>
    console.log('[places/resolve]', ...args);

  log('input url:', rawUrl);

  if (!isGoogleMapsUrl(rawUrl)) {
    log('rejected: not a Google Maps URL');
    throw new Error('invalid_url: not a Google Maps URL');
  }

  // Expand short URLs (maps.app.goo.gl, goo.gl)
  let url = rawUrl;
  const parsed = new URL(url);
  if (
    parsed.hostname === 'maps.app.goo.gl' ||
    parsed.hostname === 'goo.gl'
  ) {
    log('expanding short url...');
    url = await expandShortUrl(url);
    log('expanded url:', url);
  }

  // Try to extract place_id directly
  log('extracting place_id from url...');
  let placeId = extractPlaceIdFromUrl(url);
  log('extractPlaceIdFromUrl result:', placeId ?? 'null');

  // Fallback: use the place name + coordinates from the URL path as a text search
  if (!placeId) {
    log('falling back to text search...');
    try {
      const p = new URL(url);
      const pathParts = p.pathname.split('/');
      log('path parts:', pathParts);
      const placeIndex = pathParts.indexOf('place');
      if (placeIndex !== -1 && pathParts[placeIndex + 1]) {
        const placeName = decodeURIComponent(
          pathParts[placeIndex + 1].replace(/\+/g, ' ')
        );
        // Extract @lat,lng from path for location bias
        let locationBias: { lat: number; lng: number } | undefined;
        for (const part of pathParts) {
          const m = part.match(/^@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (m) {
            locationBias = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
            break;
          }
        }
        log('text search query:', placeName, 'locationBias:', locationBias);
        placeId = await findPlaceIdByQuery(placeName, locationBias);
        log('text search result:', placeId ?? 'null');
      } else {
        log('no /place/ segment found in path');
      }
    } catch (err) {
      log('text search error:', err);
    }
  }

  if (!placeId) {
    log('failed: could not extract place_id. full expanded url was:', url);
    throw new Error('invalid_place: could not extract place_id from URL');
  }

  log('resolved place_id:', placeId);
  return fetchPlaceDetails(placeId);
}
