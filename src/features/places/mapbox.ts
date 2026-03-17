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
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

// -------------------------------------------------------
// Suggest — autocomplete suggestions
// -------------------------------------------------------

export async function searchPlaces(
  query: string,
  sessionToken: string
): Promise<MapboxSuggestion[]> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    throw new Error('MAPBOX_SECRET_TOKEN is not configured');
  }

  const url = new URL(
    'https://api.mapbox.com/search/searchbox/v1/suggest'
  );
  url.searchParams.set('q', query);
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '5');
  url.searchParams.set('access_token', token);

  console.log('[mapbox] suggest', { query, sessionToken });

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(
      `Mapbox suggest API error: HTTP ${res.status} ${res.statusText}`
    );
  }

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
  if (!token) {
    throw new Error('MAPBOX_SECRET_TOKEN is not configured');
  }

  const url = new URL(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}`
  );
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('access_token', token);

  console.log('[mapbox] retrieve', { mapboxId, sessionToken });

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(
      `Mapbox retrieve API error: HTTP ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as {
    features?: Array<{
      properties?: {
        mapbox_id?: string;
        name?: string;
        full_address?: string;
        coordinates?: {
          longitude?: number;
          latitude?: number;
        };
      };
    }>;
  };

  const feature = json.features?.[0];
  if (!feature) {
    throw new Error('Mapbox retrieve returned no features');
  }

  const props = feature.properties ?? {};
  console.log('[mapbox] retrieve result', { name: props.name, address: props.full_address });

  return {
    mapbox_id: props.mapbox_id ?? mapboxId,
    name: props.name ?? '',
    address: props.full_address ?? null,
    lat: props.coordinates?.latitude ?? null,
    lng: props.coordinates?.longitude ?? null,
  };
}
