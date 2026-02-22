/**
 * Normalizes backend errors into user-friendly messages
 */

export interface NormalizedError {
  message: string;
  isAuthRelated: boolean;
}

export function normalizeBackendError(error: any): NormalizedError {
  console.log('[normalizeBackendError] Processing error:', error);
  console.log('[normalizeBackendError] Error type:', typeof error);
  console.log('[normalizeBackendError] Error constructor:', error?.constructor?.name);

  // Handle null/undefined errors
  if (!error) {
    console.log('[normalizeBackendError] Null/undefined error');
    return {
      message: 'An unexpected error occurred. Please try again.',
      isAuthRelated: false,
    };
  }

  // Extract error message
  let errorMessage = '';
  
  if (typeof error === 'string') {
    errorMessage = error;
    console.log('[normalizeBackendError] String error:', errorMessage);
  } else if (error.message) {
    errorMessage = error.message;
    console.log('[normalizeBackendError] Error.message:', errorMessage);
  } else if (error.toString && error.toString() !== '[object Object]') {
    errorMessage = error.toString();
    console.log('[normalizeBackendError] Error.toString():', errorMessage);
  } else {
    try {
      errorMessage = JSON.stringify(error);
      console.log('[normalizeBackendError] JSON.stringify(error):', errorMessage);
    } catch {
      errorMessage = 'An unexpected error occurred';
      console.log('[normalizeBackendError] Could not stringify error');
    }
  }

  // Check for authorization-related errors
  const isAuthRelated = 
    errorMessage.toLowerCase().includes('unauthorized') ||
    errorMessage.toLowerCase().includes('not authenticated') ||
    errorMessage.toLowerCase().includes('login required') ||
    errorMessage.toLowerCase().includes('permission denied');

  console.log('[normalizeBackendError] Is auth related:', isAuthRelated);

  // Preserve important backend messages
  if (errorMessage.includes('Unauthorized')) {
    console.log('[normalizeBackendError] Returning unauthorized message');
    return {
      message: errorMessage,
      isAuthRelated: true,
    };
  }

  // Handle common error patterns
  if (errorMessage.includes('Actor not available')) {
    console.log('[normalizeBackendError] Actor not available');
    return {
      message: 'Connection to backend is not ready. Please wait a moment and try again.',
      isAuthRelated: false,
    };
  }

  if (errorMessage.includes('File size exceeds')) {
    console.log('[normalizeBackendError] File size error');
    return {
      message: errorMessage,
      isAuthRelated: false,
    };
  }

  if (errorMessage.includes('expired')) {
    console.log('[normalizeBackendError] Expiration error');
    return {
      message: 'This paste has expired and is no longer available.',
      isAuthRelated: false,
    };
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    console.log('[normalizeBackendError] Network error');
    return {
      message: 'Network error. Please check your connection and try again.',
      isAuthRelated: false,
    };
  }

  // Default: return the error message as-is if it's reasonably short and readable
  if (errorMessage.length > 0 && errorMessage.length < 200) {
    console.log('[normalizeBackendError] Returning original message');
    return {
      message: errorMessage,
      isAuthRelated,
    };
  }

  // Fallback for very long or unclear errors
  console.log('[normalizeBackendError] Returning generic fallback');
  return {
    message: 'An error occurred while processing your request. Please try again.',
    isAuthRelated: false,
  };
}
