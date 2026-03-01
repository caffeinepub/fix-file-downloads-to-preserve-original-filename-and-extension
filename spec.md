# Specification

## Summary
**Goal:** Fix the "Unauthorized: Only logged-in users can upload files" error occurring in production when uploading files.

**Planned changes:**
- Investigate and fix the backend authentication/principal check for file upload operations to correctly handle authenticated users
- Ensure the frontend passes the authenticated actor (not an anonymous actor) when initiating file uploads
- Verify the upload flow works end-to-end in production for logged-in users

**User-visible outcome:** Logged-in users can successfully upload files in production without receiving an Unauthorized error.
