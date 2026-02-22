/**
 * Utility functions for paste ID validation and extraction
 */

/**
 * Checks if a paste ID is a legacy numeric ID
 */
export function isLegacyPasteId(pasteId: string): boolean {
  return /^\d+$/.test(pasteId);
}

/**
 * Validates if a paste ID has a valid format (either legacy numeric or new GUID format)
 */
export function isValidPasteId(pasteId: string | null | undefined): boolean {
  if (!pasteId || typeof pasteId !== 'string') {
    console.log('[isValidPasteId] Invalid input:', pasteId, 'Type:', typeof pasteId);
    return false;
  }

  const trimmed = pasteId.trim();
  
  if (trimmed.length === 0) {
    console.log('[isValidPasteId] Empty paste ID after trimming');
    return false;
  }

  // Legacy numeric IDs
  if (/^\d+$/.test(trimmed)) {
    console.log('[isValidPasteId] Valid legacy numeric ID:', trimmed);
    return true;
  }

  // New GUID format (timestamp-based, all digits)
  if (/^\d+$/.test(trimmed) && trimmed.length > 5) {
    console.log('[isValidPasteId] Valid GUID format:', trimmed);
    return true;
  }

  console.log('[isValidPasteId] Invalid paste ID format:', trimmed);
  return false;
}

/**
 * Normalizes a paste ID by trimming whitespace
 */
export function normalizePasteId(pasteId: string): string {
  const normalized = pasteId.trim();
  console.log('[normalizePasteId] Input:', pasteId, 'Output:', normalized);
  return normalized;
}

/**
 * Extracts and normalizes a paste ID from a raw hash route segment
 * Handles URL encoding and removes fragment/query string artifacts
 */
export function extractPasteIdFromRoute(route: string): string {
  console.log('[extractPasteIdFromRoute] Input route:', route);
  
  // Remove leading slash if present
  let cleaned = route.startsWith('/') ? route.slice(1) : route;
  console.log('[extractPasteIdFromRoute] After removing leading slash:', cleaned);
  
  // Remove any query string or fragment
  cleaned = cleaned.split('?')[0].split('#')[0];
  console.log('[extractPasteIdFromRoute] After removing query/fragment:', cleaned);
  
  // URL decode
  try {
    cleaned = decodeURIComponent(cleaned);
    console.log('[extractPasteIdFromRoute] After URL decode:', cleaned);
  } catch (e) {
    console.error('[extractPasteIdFromRoute] URL decode failed:', e);
  }
  
  // Normalize (trim)
  const result = normalizePasteId(cleaned);
  console.log('[extractPasteIdFromRoute] Final result:', result);
  
  return result;
}
