# Specification

## Summary
**Goal:** Fix mobile layout issues where long filenames overflow, and polish the home/create and paste view pages to look more professional and visually consistent (light/dark mode), without changing functionality.

**Planned changes:**
- Prevent long filenames from overflowing on small screens across all filename surfaces (CreatePastePage selected file list, upload progress status card, PasteViewPage file list) using responsive rules such as `min-width: 0` on flex children, wrapping/stacking on narrow viewports, and truncation or `break-word` where appropriate.
- Adjust mobile layout for PasteViewPage file rows so actions (e.g., Download) can stack below the filename on small screens while staying inline on larger screens.
- UI/UX polish for the home/create page (route “/”) to improve visual hierarchy between hero/intro and create form, plus spacing, typography, and section structure while keeping existing wording intent and all behaviors unchanged.
- Apply a single coherent presentational theme across the home/create page and paste view page (consistent card styling, borders/elevation, spacing, headings, and button emphasis states) that remains legible and cohesive in both light and dark mode.

**User-visible outcome:** On mobile devices, long filenames stay contained within cards/rows without horizontal overflow, and the home/create and paste view pages look cleaner and more professional with consistent styling across light and dark themes.
