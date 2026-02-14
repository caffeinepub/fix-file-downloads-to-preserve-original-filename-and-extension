/**
 * Utility functions for handling paste IDs (both legacy numeric and GUID-based)
 */

/**
 * Checks if a paste ID looks like a legacy numeric ID (digits only)
 */
export function isLegacyNumericId(pasteId: string): boolean {
  return /^\d+$/.test(pasteId);
}

/**
 * Validates that a paste ID is not empty or invalid
 */
export function isValidPasteId(pasteId: string | undefined | null): pasteId is string {
  return typeof pasteId === 'string' && pasteId.trim().length > 0;
}

/**
 * Normalizes a paste ID by trimming whitespace
 */
export function normalizePasteId(pasteId: string): string {
  return pasteId.trim();
}

/**
 * Extracts and normalizes a paste ID from a raw hash route segment.
 * Strips trailing slashes, decodes URL encoding, removes query strings and fragments.
 * 
 * @param rawSegment - The raw route segment after /p/ (e.g., "1234/", "1234?x=y", "1234#anchor")
 * @returns Normalized paste ID safe for validation and fetching
 */
export function extractPasteIdFromRoute(rawSegment: string): string {
  // Remove query string and fragment
  let cleaned = rawSegment.split('?')[0].split('#')[0];
  
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  
  // Decode URL encoding
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch (e) {
    // If decoding fails, use the original cleaned string
    console.warn('Failed to decode paste ID:', e);
  }
  
  // Trim whitespace
  return cleaned.trim();
}
