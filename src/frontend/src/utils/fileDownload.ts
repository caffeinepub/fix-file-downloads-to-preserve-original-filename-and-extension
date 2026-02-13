/**
 * Utility functions for downloading files with proper filenames and extensions
 */

import { ExternalBlob } from '../backend';

/**
 * Map common MIME types to file extensions
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/json': '.json',
  'text/plain': '.txt',
  'text/html': '.html',
  'text/css': '.css',
  'text/javascript': '.js',
  'application/javascript': '.js',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

/**
 * Infer file extension from MIME type
 */
function inferExtensionFromMimeType(mimeType: string | undefined): string {
  if (!mimeType) return '';
  return MIME_TO_EXTENSION[mimeType.toLowerCase()] || '';
}

/**
 * Check if filename has an extension
 */
function hasExtension(filename: string): boolean {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 && lastDot < filename.length - 1;
}

/**
 * Compute a safe download filename from stored metadata
 * @param filename - The stored filename (may be empty or missing extension)
 * @param contentType - The MIME type (optional)
 * @param fallbackIndex - Index to use for fallback naming
 * @returns A filename with extension suitable for download
 */
export function computeDownloadFilename(
  filename: string | undefined,
  contentType: string | undefined,
  fallbackIndex: number
): string {
  // Treat empty/whitespace-only filenames as missing
  const trimmedFilename = filename?.trim();
  
  // If we have a filename with extension, use it as-is
  if (trimmedFilename && hasExtension(trimmedFilename)) {
    return trimmedFilename;
  }

  // If we have a filename without extension but have MIME type, append extension
  if (trimmedFilename && contentType) {
    const extension = inferExtensionFromMimeType(contentType);
    if (extension) {
      return trimmedFilename + extension;
    }
    return trimmedFilename;
  }

  // If we have a filename but no MIME type, use it as-is
  if (trimmedFilename) {
    return trimmedFilename;
  }

  // Fallback: generate a name with extension if we have MIME type
  const extension = inferExtensionFromMimeType(contentType);
  return `file-${fallbackIndex + 1}${extension || '.bin'}`;
}

/**
 * Download a file from ExternalBlob with proper filename
 * @param blob - The ExternalBlob to download
 * @param filename - The filename to use for download
 * @param contentType - Optional MIME type for the blob
 */
export async function downloadExternalBlob(
  blob: ExternalBlob,
  filename: string,
  contentType?: string
): Promise<void> {
  try {
    // Fetch the bytes from the ExternalBlob
    const bytes = await blob.getBytes();

    // Create a Blob with the appropriate MIME type
    const fileBlob = new Blob([bytes], {
      type: contentType || 'application/octet-stream',
    });

    // Create an Object URL
    const objectUrl = URL.createObjectURL(fileBlob);

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = objectUrl;
    
    // Set download attribute in multiple ways for maximum browser compatibility
    link.download = filename;
    link.setAttribute('download', filename);
    
    // Append to DOM (required for Firefox and some mobile browsers)
    link.style.display = 'none';
    document.body.appendChild(link);

    // Trigger download with a slight delay to ensure DOM is ready
    requestAnimationFrame(() => {
      link.click();
      
      // Delay cleanup to avoid race conditions on mobile browsers
      // This ensures the download has started before we revoke the URL
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      }, 100);
    });
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}
