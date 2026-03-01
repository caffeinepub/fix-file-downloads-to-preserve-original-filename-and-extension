# Specification

## Summary
**Goal:** Fix paste retrieval so newly created pastes can be viewed immediately, and remove draft editor console errors.

**Planned changes:**
- Remove or suppress the draft-editor origin error that appears in the console during paste operations
- Fix backend paste retrieval logic to return correct paste data for valid IDs instead of null
- Verify paste ID format consistency between creation and retrieval operations

**User-visible outcome:** Users can view their pastes immediately after creating them without encountering "Paste Not Found" errors, and the console will be free of draft-editor origin errors.
