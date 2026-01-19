---
phase: 10-class-bank-core
plan: 02
subsystem: class-bank
tags: [dropdown, load, App.tsx, integration, students, localStorage]

dependency_graph:
  requires:
    - 10-01 (SavedClass type, useClassBank hook, ClassBankSaveModal)
  provides:
    - ClassBankDropdown component for loading classes
    - Complete save/load UI in student management bar
    - Active class indicator
  affects:
    - 11-class-management-ui (will add edit/delete management features)

tech_stack:
  added: []
  patterns:
    - Click-outside detection with mousedown listener
    - Escape key handler for dropdown close
    - State-driven conditional rendering

key_files:
  created:
    - components/ClassBankDropdown.tsx
  modified:
    - App.tsx

decisions:
  - decision: Place Save/Load buttons before student chips
    rationale: Groups class management controls together, logical flow
    alternatives: [After student chips, Separate toolbar]
  - decision: Use indigo theme for active class indicator
    rationale: Consistent with app's primary accent colors
    alternatives: [Amber theme, Slate/neutral]

metrics:
  duration: ~4 min
  completed: 2026-01-20
---

# Phase 10 Plan 2: Load Dropdown and Integration Summary

ClassBankDropdown component for loading saved classes and full integration of Save/Load UI into App.tsx student management bar.

## What Was Built

### Task 1: ClassBankDropdown Component
- Dropdown menu for loading saved classes
- Displays each class with name and student count ("24 students")
- Click-outside detection to close dropdown
- Escape key closes dropdown
- Hover states with chevron indicator
- Empty state for defensive rendering

### Task 2: App.tsx Integration
- Added imports for useClassBank, ClassBankSaveModal, ClassBankDropdown
- Save button in student bar (disabled when no students)
- Load button in student bar (disabled when no saved classes)
- Active class indicator shows after loading a class
- Clear button to dismiss active class indicator
- Toast notifications on save ("Class saved!") and load ("Loaded {name}")
- Unsaved students warning before loading ("You have students not saved. Load anyway?")
- Clear activeClassName when manually modifying students

### Task 3: End-to-End Verification
- TypeScript compiles without errors
- App builds successfully with Vite
- All CLASS requirements (01-04) satisfied

## Key Implementation Details

### ClassBankDropdown Props
```typescript
interface ClassBankDropdownProps {
  classes: SavedClass[];
  onLoad: (classData: SavedClass) => void;
  onClose: () => void;
}
```

### Click-Outside Detection
```typescript
useEffect(() => {
  const handleMouseDown = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  document.addEventListener('mousedown', handleMouseDown);
  return () => document.removeEventListener('mousedown', handleMouseDown);
}, [onClose]);
```

### Load Handler with Unsaved Warning
```typescript
const handleLoadClassBank = (classData: SavedClass) => {
  const hasUnsavedStudents = studentNames.length > 0 && activeClassName === null;
  if (hasUnsavedStudents) {
    if (!window.confirm('You have students not saved. Load anyway?')) {
      return;
    }
  }
  setStudentNames(classData.students);
  setActiveClassName(classData.name);
  setShowLoadDropdown(false);
  addToast(`Loaded ${classData.name}`, 3000, 'success');
};
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Place Save/Load buttons in Class Bank Controls group | Logical grouping, clear visual separation from student chips |
| Add divider between controls and active class indicator | Visual hierarchy, separates actions from status |
| Clear activeClassName on any manual student modification | Accurately tracks "dirty" state for unsaved warning |

## Commits

| Hash | Description |
|------|-------------|
| a69008f | feat(10-02): add ClassBankDropdown component |
| 08a6b77 | feat(10-02): integrate class bank UI into App.tsx |

## Requirements Satisfied

| Requirement | Implementation |
|-------------|----------------|
| CLASS-01: Save with custom name | ClassBankSaveModal with name input |
| CLASS-02: Load to populate | ClassBankDropdown loads students |
| CLASS-03: Available across presentations | localStorage persists across sessions |
| CLASS-04: localStorage storage | pipi-class-bank key with JSON serialization |

## Next Phase Readiness

### Blockers
None - Class Bank Core complete.

### Ready For
- Phase 11: Class Management UI (rename, edit students, delete classes)
- Full manual testing of save/load workflow

---

*Plan: 10-02*
*Completed: 2026-01-20*
