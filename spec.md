# Specification

## Summary
**Goal:** Enforce real-time expiration checks on the backend and frontend to prevent expired paste attachments and images from being downloaded.

**Planned changes:**
- On the backend, add an expiration check when any blob/attachment is requested; if the parent paste is expired, return an expiration error instead of serving the data.
- On the frontend in `PasteViewPage.tsx`, perform a fresh backend expiration check when the user clicks a download button; if the paste is expired at that moment, abort the download and display the expired error state.

**User-visible outcome:** If a paste expires while the page is open, clicking the download button will no longer deliver the file or image — instead, the expired error state is shown. Direct backend calls to retrieve attachments for expired pastes are also blocked.
