---
phase: 10-class-bank-core
plan: 01
subsystem: class-bank
tags: [localStorage, hooks, modal, persistence, students]

dependency_graph:
  requires:
    - 08-01 (established localStorage patterns via useSettings, useAutoSave)
  provides:
    - SavedClass type for class bank data
    - useClassBank hook for localStorage persistence
    - ClassBankSaveModal component for save flow
  affects:
    - 10-02 (will add load dropdown and App.tsx integration)

tech_stack:
  added: []
  patterns:
    - Type guard validation for localStorage data
    - Custom hook with useCallback for class operations
    - Modal with auto-focus and keyboard navigation

key_files:
  created:
    - hooks/useClassBank.ts
    - components/ClassBankSaveModal.tsx
  modified:
    - types.ts

decisions:
  - decision: Use CLASS_BANK_KEY constant for storage key
    rationale: Consistent with existing STORAGE_KEY pattern in useSettings
    alternatives: [Inline key string, exported from types.ts]

metrics:
  duration: ~3 min
  completed: 2026-01-20
---

# Phase 10 Plan 1: Class Bank Foundation Summary

localStorage persistence layer and save modal for class bank feature with type-safe validation and duplicate handling.

## What Was Built

### Task 1: SavedClass Type and useClassBank Hook
- Added `SavedClass` interface to types.ts with id, name, students array, and savedAt timestamp
- Created `useClassBank` hook with:
  - `classes: SavedClass[]` - current saved classes
  - `saveClass(name, students)` - saves/updates a class by name
  - `deleteClass(classId)` - removes class by ID
  - `getClassByName(name)` - returns class for duplicate checking
  - `refreshClasses()` - re-reads from localStorage
- Type guard validation (`isValidSavedClass`) ensures data integrity
- Handles `QuotaExceededError` gracefully with console warning

### Task 2: ClassBankSaveModal Component
- Modal with name input for saving classes
- Auto-focus on input when modal opens
- Save button disabled for empty/whitespace names
- Duplicate name detection shows warning text
- Confirmation prompt via `window.confirm()` for duplicates
- Escape key closes modal, Enter key triggers save
- Dark mode support with indigo (light) / amber (dark) theme

## Key Implementation Details

### SavedClass Type
```typescript
export interface SavedClass {
  id: string;           // crypto.randomUUID()
  name: string;         // User-provided name (trimmed)
  students: string[];   // Array of student names
  savedAt: string;      // ISO 8601 timestamp
}
```

### localStorage Validation Pattern
```typescript
function isValidSavedClass(data: unknown): data is SavedClass {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.name !== 'string') return false;
  if (!Array.isArray(obj.students)) return false;
  if (!obj.students.every((s: unknown) => typeof s === 'string')) return false;
  if (typeof obj.savedAt !== 'string') return false;
  return true;
}
```

### Duplicate Handling
```typescript
const isDuplicate = existingNames.includes(trimmedName);
if (isDuplicate) {
  const confirmed = window.confirm('A class with this name exists. Replace it?');
  if (!confirmed) return;
}
onSave(trimmedName);
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Export CLASS_BANK_KEY constant | Allows testing and external access to storage key |
| Validate every student string in array | Prevents corrupted data from breaking the UI |
| Use window.confirm for duplicates | Simple, per CONTEXT.md and RESEARCH.md guidance |

## Commits

| Hash | Description |
|------|-------------|
| 014b3f2 | feat(10-01): add SavedClass type and useClassBank hook |
| 151b1b1 | feat(10-01): create ClassBankSaveModal component |

## Next Phase Readiness

### Blockers
None - foundation ready for integration.

### Ready For
- Plan 10-02: Create ClassBankDropdown for loading classes
- Plan 10-02: Integrate Save/Load buttons into App.tsx student bar

---

*Plan: 10-01*
*Completed: 2026-01-20*
