# Specification

## Summary
**Goal:** Ensure file downloads preserve the original uploaded filename (including extension) instead of defaulting to a generic name like "download", including on mobile Chromium/Brave.

**Planned changes:**
- Update the paste view download flow to always pass stored file metadata (filename and contentType) into the download utility for every downloadable file/chunk.
- Keep/ensure a fallback filename is computed when metadata is missing or incomplete (including MIME-based extension inference), and avoid producing the literal name "download" unless it was actually stored.
- Harden `downloadExternalBlob` in `frontend/src/utils/fileDownload.ts` to set the filename in a browser-compatible way (attribute + property) and delay Object URL cleanup to avoid race conditions that cause generic filenames on some browsers (notably mobile Chromium/Brave).

**User-visible outcome:** Clicking “Download” on any uploaded file downloads with the original uploaded filename (or a sensible fallback) across supported file types, including on mobile Chromium/Brave, with no UI changes other than the corrected saved filename.
