# Specification

## Summary
**Goal:** Polish paste expiration wording and make paste creation feedback appear immediately with clearer, more professional progress/status indicators, while improving perceived and actual upload responsiveness.

**Planned changes:**
- Update the PasteViewPage expiration label copy to remove the redundant word “left” and ensure natural phrasing across all expiration time formats.
- Adjust the paste creation flow so an in-form status/progress panel appears immediately on “Create Paste” click, including an explicit intermediate “preparing” state when upload progress events haven’t started yet.
- Keep the “Create Paste” button disabled for the full operation and make the status/progress panel the primary indicator to prevent a delayed/secondary progress UI.
- Investigate and reduce delays before upload starts/progress events fire, while keeping the existing 50MB per-file limit and user-friendly English errors; make any necessary improvements across frontend/backend without adding new backend actors or external services.

**User-visible outcome:** Expiration messages read naturally (e.g., “Expires in 9 min”), and when creating a paste users see immediate, continuous status/progress feedback through preparation, upload, and final creation, with improved responsiveness for file uploads.
