/**
 * Deterministic remote ID generation for matching local rows to PocketBase records.
 *
 * When populating PocketBase, import records with these same IDs so that
 * the sync service can match them to existing local data without losing
 * card_progress or review_history references.
 *
 * IDs are 15 alphanumeric characters — the same length as PocketBase's
 * auto-generated IDs — produced by combining two independent hash functions
 * (FNV-1a and djb2) for adequate collision resistance.
 */

function hashToId(input: string): string {
  let h1 = 0x811c9dc5; // FNV-1a offset basis
  let h2 = 5381; // djb2 seed

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);

    // FNV-1a
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);

    // djb2
    h2 = ((h2 << 5) + h2 + c) & 0xffffffff;
  }

  // Each 32-bit hash → 7 base36 chars.  XOR the two hashes to derive a
  // 15th character so the total length matches PocketBase's ID format.
  const p1 = (h1 >>> 0).toString(36).padStart(7, '0');
  const p2 = (h2 >>> 0).toString(36).padStart(7, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(36).padStart(7, '0');

  return (p1 + p2 + p3).slice(0, 15);
}

/**
 * Generate a deterministic remote ID for a noun based on its natural key.
 * When a sense is provided (homograph disambiguation), it is included in the
 * hash so that same-article homographs (e.g. "die Mutter (mother)" vs
 * "die Mutter (nut)") receive distinct remote IDs.
 */
export function generateNounRemoteId(
  german: string,
  article: string,
  sense?: string | null,
): string {
  const key = sense
    ? `noun:${german}:${article}:${sense}`
    : `noun:${german}:${article}`;
  return hashToId(key);
}

/** Generate a deterministic remote ID for a category based on its name. */
export function generateCategoryRemoteId(name: string): string {
  return hashToId(`category:${name}`);
}
