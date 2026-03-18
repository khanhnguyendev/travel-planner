/**
 * Extract a readable province/city tag from a full address string.
 * Skips country, postal codes, numeric-only parts, and bare Vietnamese
 * administrative-unit words (Phường, Quận, Huyện, etc.) that appear alone
 * after digit stripping.
 *
 * Examples:
 *   "Tổ 16 thôn 1, Tà Nung, Đà Lạt, Lâm Đồng 670000" → "Lâm Đồng"
 *   "123 Phố Huế, Hai Bà Trưng, Hà Nội, Việt Nam"     → "Hà Nội"
 *   "5 Ave, New York, NY 10001, USA"                   → "New York"
 */

// Generic admin-unit words that are not meaningful as location tags on their own
const GENERIC_ADMIN_WORDS = new Set([
  'phường', 'phuong', 'quận', 'quan', 'huyện', 'huyen',
  'xã', 'xa', 'thôn', 'thon', 'tổ', 'to', 'thị trấn', 'thi tran',
  'tỉnh', 'tinh', 'thành phố', 'thanh pho', 'tp',
]);

export function extractLocationTag(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // Work from the end, skipping country and postal-code-like parts
  const candidates = [...parts].reverse();
  for (const part of candidates) {
    // Skip country name at the tail (only letters/spaces, > 3 chars)
    if (/^[A-Za-zÀ-ỹ\s.]+$/.test(part) && part.length > 3 && candidates[0] === part) continue;
    // Skip pure digits or postal codes like "66100", "NY 10001"
    if (/^\d+$/.test(part)) continue;
    if (/^[A-Z]{2}\s*\d+$/.test(part)) continue;
    // Strip trailing numbers (e.g. "Lâm Đồng 670000" → "Lâm Đồng")
    const cleaned = part.replace(/\s+\d+$/, '').trim();
    // Skip bare generic admin-unit words (e.g. "Phường" after stripping "6")
    if (GENERIC_ADMIN_WORDS.has(cleaned.toLowerCase())) continue;
    if (cleaned.length > 0) return cleaned;
  }
  return null;
}
