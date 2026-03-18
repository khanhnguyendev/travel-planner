/**
 * Server-side only: Mapbox Search Box API helpers.
 * Never call these from the browser — they use MAPBOX_SECRET_TOKEN.
 */

export interface MapboxSuggestion {
  name: string;
  full_address: string | null;
  mapbox_id: string;
  place_formatted: string | null;
}

export interface MapboxPlaceDetail {
  mapbox_id: string;
  feature_type: string | null;
  name: string;
  address: string | null;         // full_address
  place_formatted: string | null; // e.g. "Phường 9, Đà Lạt, Lâm Đồng, Vietnam"
  lat: number | null;
  lng: number | null;
  // Structured context
  country: string | null;
  region: string | null;          // province / tỉnh
  district: string | null;        // city / quận / huyện
  place: string | null;           // ward / phường / xã
  street: string | null;
  postcode: string | null;
}

// -------------------------------------------------------
// Suggest — autocomplete suggestions
// -------------------------------------------------------

export async function searchPlaces(
  query: string,
  sessionToken: string
): Promise<MapboxSuggestion[]> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) throw new Error('MAPBOX_SECRET_TOKEN is not configured');

  const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
  url.searchParams.set('q', query);
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('language', 'vi');
  url.searchParams.set('limit', '5');
  url.searchParams.set('access_token', token);

  console.log('[mapbox] suggest', { query });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Mapbox suggest API error: HTTP ${res.status} ${res.statusText}`);

  const json = (await res.json()) as {
    suggestions?: Array<{
      name?: string;
      full_address?: string;
      mapbox_id?: string;
      place_formatted?: string;
    }>;
  };

  console.log('[mapbox] suggest results', { count: json.suggestions?.length ?? 0 });

  return (json.suggestions ?? []).map((s) => ({
    name: s.name ?? '',
    full_address: s.full_address ?? null,
    mapbox_id: s.mapbox_id ?? '',
    place_formatted: s.place_formatted ?? null,
  }));
}

// -------------------------------------------------------
// Retrieve — full place details for a selected suggestion
// -------------------------------------------------------

export async function retrievePlace(
  mapboxId: string,
  sessionToken: string
): Promise<MapboxPlaceDetail> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) throw new Error('MAPBOX_SECRET_TOKEN is not configured');

  const url = new URL(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}`
  );
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('language', 'vi');
  url.searchParams.set('access_token', token);

  console.log('[mapbox] retrieve', { mapboxId });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Mapbox retrieve API error: HTTP ${res.status} ${res.statusText}`);

  const json = (await res.json()) as {
    features?: Array<{
      properties?: {
        mapbox_id?: string;
        feature_type?: string;
        name?: string;
        full_address?: string;
        place_formatted?: string;
        coordinates?: { longitude?: number; latitude?: number };
        context?: {
          country?:  { name?: string; country_code?: string };
          region?:   { name?: string; region_code?: string };
          district?: { name?: string };
          place?:    { name?: string };
          street?:   { name?: string };
          postcode?: { name?: string };
        };
      };
    }>;
  };

  console.log('[mapbox] retrieve raw json', JSON.stringify(json, null, 2));

  const feature = json.features?.[0];
  if (!feature) throw new Error('Mapbox retrieve returned no features');

  const p = feature.properties ?? {};
  const ctx = p.context ?? {};

  const detail: MapboxPlaceDetail = {
    mapbox_id:      p.mapbox_id ?? mapboxId,
    feature_type:   p.feature_type ?? null,
    name:           p.name ?? '',
    address:        p.full_address ?? null,
    place_formatted: p.place_formatted ?? null,
    lat:            p.coordinates?.latitude ?? null,
    lng:            p.coordinates?.longitude ?? null,
    country:        ctx.country?.name ?? null,
    region:         ctx.region?.name ?? null,
    district:       ctx.district?.name ?? null,
    place:          ctx.place?.name ?? null,
    street:         ctx.street?.name ?? null,
    postcode:       ctx.postcode?.name ?? null,
  };

  console.log('[mapbox] retrieve result', detail);

  return detail;
}
