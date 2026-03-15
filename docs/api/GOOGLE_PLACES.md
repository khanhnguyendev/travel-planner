# Google Places Integration

Scope: resolve Google Maps links into normalized place records while keeping Google reviews read-only external content.

## Input Rules
- Accept Google Maps share URLs or place URLs; reject non-Google hosts.
- Extract `place_id` from URL; if missing, use Place Details with `fields=place_id`.
- Validate the URL belongs to the same project context before writing.

## Field Mask
Use Place Details with a narrow field mask to control quota and PII:\n`name,formatted_address,geometry/location,place_id,rating,price_level,editorial_summary,reviews,photo_urls?`\nLimit reviews to 3 recent/high-signal items (high rating count, non-empty text).

## Caching & De-duplication
- Cache by `external_place_id` within a project; do not insert duplicates (unique `(project_id, external_place_id)` in DB).
- Store raw metadata in `places.metadata_json` for troubleshooting; store a short display subset on the place row.
- Refresh window: allow `forceRefresh` flag to refetch and overwrite cached metadata; otherwise reuse cached data if younger than 24h.

## Review Handling
- Treat reviews as snapshots; store author name, rating, text, published date, source provider, and raw JSON.
- Never allow editing reviews inside the app; display as read-only with Google attribution.
- Do not store reviewer profile photos to avoid PII expansion.

## Rate Limits / Resilience
- Keep requests server-side; never expose API key to the client.
- Apply exponential backoff on 429/5xx; surface user-friendly error message when quota exceeded.
- Log `external_place_id`, status, and latency for observability.

## Validation
- The place’s geographic coordinates are stored (`lat`, `lng`) to support map previews later.
- If the URL resolves outside supported countries or lacks required fields, return `invalid_place` error and do not store a row.
