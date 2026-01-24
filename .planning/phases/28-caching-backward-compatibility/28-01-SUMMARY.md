---
phase: 28
plan: 01
subsystem: verbosity-caching
tags: [state-management, caching, file-format, backward-compatibility]
dependency-graph:
  requires: [27-01, 27-02]
  provides: [verbosity-cache, instant-switching, file-v2]
  affects: []
tech-stack:
  added: []
  patterns: [per-slide-caching, cache-invalidation, optional-property-migration]
key-files:
  created: []
  modified: [types.ts, services/loadService.ts, components/PresentationView.tsx, App.tsx]
decisions:
  - Cache only concise/detailed (standard uses speakerNotes directly)
  - Clear cache when content or title changes (invalidation strategy)
  - Maintain verbosity selection during slide navigation
  - No actual migration logic needed (optional field defaults to undefined)
metrics:
  duration: ~10min
  completed: 2026-01-24
---

# Phase 28 Plan 01: Caching & Backward Compatibility Summary

Per-slide verbosity caching with instant switching, file format v2, and backward compatibility for old .cue files.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0aab843 | feat | Add verbosityCache to Slide interface and bump CURRENT_FILE_VERSION to 2 |
| e814103 | feat | Implement cache-aware verbosity with navigation persistence |

## Task Summary

### Task 1: Type Layer - Slide Interface and File Version
Added optional `verbosityCache` property to the Slide interface with `concise` and `detailed` fields. Standard verbosity uses the existing `speakerNotes` field, so only non-standard levels need caching. Bumped `CURRENT_FILE_VERSION` from 1 to 2 and documented the v1->v2 migration case in `loadService.ts` (no actual migration logic needed since the field is optional).

### Task 2: State Layer - Caching, Navigation, and Invalidation
Implemented the complete caching system:
- Modified `handleUpdateSlide` in App.tsx to clear `verbosityCache` when `content` or `title` changes
- Added `onUpdateSlide` prop to PresentationView for persisting cache updates
- Replaced `handleVerbosityChange` with cache-aware version that checks cache before regenerating
- Changed navigation effect to maintain verbosity selection and load from cache on slide change

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

| Criterion | Status |
|-----------|--------|
| Switching to previously generated level is instant | Ready |
| Browser refresh preserves verbosity cache | Ready |
| Verbosity selection persists during navigation | Ready |
| Editing slide content clears cached scripts | Ready |
| Old .cue files load without errors | Ready |

All success criteria implemented. Functional verification requires runtime testing:
1. VERB-09: Generate Detailed, switch to Standard, switch back to Detailed - instant
2. VERB-10: Refresh browser, open same file, click Detailed - instant from cache
3. VERB-11: Open old v1 .cue file - loads normally, Standard default works
4. VERB-12: Save file with cache, reload - Detailed instant

## Technical Notes

### Cache Structure
```typescript
verbosityCache?: {
  concise?: string;
  detailed?: string;
};
```
Standard verbosity always reads from `speakerNotes`, never cached.

### Invalidation Logic
Cache cleared when:
- `content` or `title` field is updated (content changes)
- Cache preserved when only `verbosityCache` itself is updated

### Navigation Persistence
Verbosity level now persists across slide navigation. On navigating to a slide:
- If standard: show speakerNotes
- If concise/detailed: show cached script if available, else null (user can click to regenerate)

## Next Phase Readiness

Phase 28 is a single-plan phase. This completes the Verbosity feature (v3.1):
- Phase 27: UI and AI regeneration
- Phase 28: Caching and backward compatibility

All VERB tickets (VERB-01 through VERB-12) addressed.
