# Phase 35: Persistence - Research

**Researched:** 2026-01-25
**Domain:** File Format Migration, State Persistence, Backward Compatibility
**Confidence:** HIGH

## Summary

This phase persists the deck-wide verbosity level (`deckVerbosity`) in the .cue file format. The current file format (v2) stores per-slide `verbosityCache` but does NOT store the deck-level verbosity setting. When a user sets "Detailed" verbosity and saves, that choice should be restored when loading.

The implementation requires:
1. Adding `deckVerbosity` as a top-level field in CueFile interface
2. Bumping file version from 2 to 3
3. Updating save flow to include verbosity
4. Updating load flow to restore verbosity (defaulting to 'standard' for v2 files)
5. Passing verbosity state between App.tsx and PresentationView.tsx

The existing migration pattern (v1->v2) provides a clear template. The key architectural decision is storing `deckVerbosity` at the root CueFile level (not in `content`), which matches the CONTEXT.md decision.

**Primary recommendation:** Add `deckVerbosity?: VerbosityLevel` to CueFile interface, bump to v3, handle migration with fallback to 'standard'.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8.2 | Type-safe interface extension | Compile-time safety for file format changes |
| React useState | 19.2.0 | Verbosity state management | Already used for deckVerbosity in PresentationView |

### File Format
| Component | Current | After Phase | Purpose |
|-----------|---------|-------------|---------|
| CURRENT_FILE_VERSION | 2 | 3 | Version tracking for migration |
| CueFile interface | No deckVerbosity | deckVerbosity field | Store deck verbosity setting |
| VerbosityLevel type | 'concise' \| 'standard' \| 'detailed' | No change | Type for verbosity values |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| loadService.ts migrateFile() | Version migration | v2->v3 migration logic |
| saveService.ts createCueFile() | File creation | Add deckVerbosity parameter |
| isValidCueFile() | Type guard | Optional: validate deckVerbosity field |

### Installation
No new packages required. Uses existing TypeScript and React patterns.

## Architecture Patterns

### Current State Flow
```
App.tsx (upfrontVerbosity for generation)
    |
    v
PresentationView.tsx (deckVerbosity state - LOCAL, not saved)
    |
    v
verbosityCache (per-slide, ALREADY saved in CueFile.content.slides)
```

### Recommended State Flow After Phase
```
App.tsx (upfrontVerbosity for generation, deckVerbosity for persistence)
    |
    +-- Save: createCueFile(..., deckVerbosity)
    |
    +-- Load: setDeckVerbosity(cueFile.deckVerbosity || 'standard')
    |
    v
PresentationView.tsx (receives deckVerbosity as prop OR lifts state to App)
```

### Pattern 1: Root-Level Field (RECOMMENDED)
**What:** Store `deckVerbosity` alongside existing root fields (version, createdAt, modifiedAt, title, content)

**Why:** Matches CONTEXT.md decision. Deck verbosity is a presentation-level setting, not content.

**Example CueFile structure:**
```typescript
interface CueFile {
  version: number;                    // 3
  createdAt: string;
  modifiedAt: string;
  title: string;
  author?: string;
  deckVerbosity?: VerbosityLevel;     // NEW - optional for backward compat
  content: CueFileContent;
}
```

### Pattern 2: State Lifting for Save/Load
**What:** Lift `deckVerbosity` state from PresentationView to App.tsx for persistence

**Why:** App.tsx handles save/load, needs access to verbosity for both operations

**Options:**
A. **Prop drilling:** Pass `deckVerbosity` and `onDeckVerbosityChange` to PresentationView
B. **State initialization:** Pass initial verbosity to PresentationView, sync on save
C. **Callback on save:** PresentationView reports current verbosity when saving

**Recommendation:** Option A (prop drilling) - simplest, matches existing patterns for `onUpdateSlide`

### Pattern 3: Backward-Compatible Default
**What:** Loading v2 files defaults `deckVerbosity` to 'standard'

**Why:** v2 files have no verbosity field; 'standard' matches user expectation and upload default

**Implementation:**
```typescript
// loadService.ts migrateFile
if (fromVersion === 2) {
  // v2 -> v3: Added deckVerbosity field
  // No action needed - optional field defaults in App.tsx when undefined
}

// App.tsx handleLoadFile
const loadedVerbosity = cueFile.deckVerbosity || 'standard';
setDeckVerbosity(loadedVerbosity);
```

### Anti-Patterns to Avoid
- **Storing verbosity in content:** Don't add to CueFileContent - it's deck-level, not content
- **Breaking v2 loading:** Don't require deckVerbosity field - must be optional
- **Regenerating on v2 load:** Don't auto-regenerate scripts when loading v2 files
- **Ignoring cache on load:** Preserve existing verbosityCache from v2 files

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type validation | Runtime type checking | TypeScript optional property | Compile-time safety |
| Migration framework | Custom migration system | Existing migrateFile() switch statement | Already proven pattern |
| Version detection | Manual version parsing | Existing fromVersion comparison | Already handles v1->v2 |
| Verbosity validation | Custom validator | VerbosityLevel union type | TypeScript ensures valid values |

**Key insight:** The existing migration pattern handles all complexity. This phase adds one field and one migration case.

## Common Pitfalls

### Pitfall 1: Breaking Existing v2 Files
**What goes wrong:** Making `deckVerbosity` required in CueFile type causes TypeScript errors when loading v2 files

**Why it happens:** v2 files don't have this field; strict typing rejects them

**How to avoid:** Use optional property: `deckVerbosity?: VerbosityLevel`

**Warning signs:**
- TypeScript errors on file load
- Runtime errors: "Cannot read property 'deckVerbosity' of undefined"

### Pitfall 2: UI Not Reflecting Loaded Verbosity
**What goes wrong:** Verbosity selector shows 'standard' even when v3 file was saved with 'detailed'

**Why it happens:** State not initialized from loaded file, or state in wrong component

**How to avoid:**
1. Ensure App.tsx reads `deckVerbosity` from loaded file
2. Pass verbosity to PresentationView as initial value or controlled prop
3. Verify state flows from load -> App.tsx -> PresentationView

**Warning signs:**
- Console log shows correct loaded value but UI doesn't match
- Selector resets to standard when entering presentation

### Pitfall 3: Save Not Capturing Current Verbosity
**What goes wrong:** File saves with verbosity=undefined despite UI showing 'detailed'

**Why it happens:** Verbosity state in PresentationView, save logic in App.tsx, no connection

**How to avoid:**
- Option A: Lift verbosity state to App.tsx
- Option B: Pass verbosity to createCueFile from App.tsx state

**Warning signs:**
- Saved file missing deckVerbosity field
- Load -> Save -> Load cycle loses verbosity

### Pitfall 4: Migration Not Triggering
**What goes wrong:** v2 files load without migration, version stays 2 in saved file

**Why it happens:** migrateFile() only runs when `fromVersion < CURRENT_FILE_VERSION`

**How to avoid:** Ensure CURRENT_FILE_VERSION is bumped to 3 in types.ts

**Warning signs:**
- Console log never shows "Migrating file from version 2 to 3"
- Re-saved files still have version: 2

### Pitfall 5: Per-Slide Cache Cleared on Load
**What goes wrong:** Existing verbosityCache in slides gets cleared when loading v2 files

**Why it happens:** Migration logic accidentally overwrites slides array

**How to avoid:** Migration for v2->v3 should NOT touch content.slides - only add root-level field

**Warning signs:**
- "Detailed" button requires regeneration after load despite previously cached
- User reports losing cached scripts

## Code Examples

### CueFile Interface Extension
```typescript
// types.ts - Current
export interface CueFile {
  version: number;
  createdAt: string;
  modifiedAt: string;
  title: string;
  author?: string;
  content: CueFileContent;
}

// types.ts - After Phase 35
export interface CueFile {
  version: number;
  createdAt: string;
  modifiedAt: string;
  title: string;
  author?: string;
  deckVerbosity?: VerbosityLevel;  // NEW - optional for v2 compat
  content: CueFileContent;
}
```

### Version Bump
```typescript
// types.ts - Current
export const CURRENT_FILE_VERSION = 2;

// types.ts - After Phase 35
export const CURRENT_FILE_VERSION = 3;
```

### Migration Function Update
```typescript
// loadService.ts migrateFile() - Add v2->v3 case
function migrateFile(data: CueFile): CueFile {
  const fromVersion = data.version;

  if (fromVersion < CURRENT_FILE_VERSION) {
    console.log(`Migrating file from version ${fromVersion} to ${CURRENT_FILE_VERSION}`);

    // v1 -> v2: Added verbosityCache to Slide interface
    if (fromVersion === 1) {
      // Slides without verbosityCache will have it as undefined
    }

    // v2 -> v3: Added deckVerbosity to CueFile root
    if (fromVersion === 2) {
      // No action needed - deckVerbosity is optional
      // App.tsx defaults to 'standard' when undefined
    }
  }

  return {
    ...data,
    version: CURRENT_FILE_VERSION,
  };
}
```

### Save Service Update
```typescript
// saveService.ts - Updated createCueFile
export function createCueFile(
  title: string,
  slides: Slide[],
  studentNames: string[],
  lessonText: string,
  existingFile?: CueFile,
  studentGrades?: StudentWithGrade[],
  deckVerbosity?: VerbosityLevel  // NEW parameter
): CueFile {
  const now = new Date().toISOString();

  return {
    version: CURRENT_FILE_VERSION,
    createdAt: existingFile?.createdAt ?? now,
    modifiedAt: now,
    title,
    ...(deckVerbosity && deckVerbosity !== 'standard' ? { deckVerbosity } : {}),
    content: {
      slides,
      studentNames,
      lessonText,
      ...(studentGrades && studentGrades.length > 0 ? { studentGrades } : {}),
    },
  };
}
```

### Load Flow in App.tsx
```typescript
// App.tsx handleLoadFile - Add verbosity restoration
const handleLoadFile = useCallback(async (file: File) => {
  // ... existing validation ...

  try {
    const cueFile = await readCueFile(file);
    setSlides(cueFile.content.slides);
    setStudentNames(cueFile.content.studentNames || []);
    setLessonText(cueFile.content.lessonText || '');
    setLessonTitle(cueFile.title);

    // Restore deck verbosity (defaults to standard for v2 files)
    setDeckVerbosity(cueFile.deckVerbosity || 'standard');

    // ... rest of existing logic ...
  } catch (err) {
    // ... error handling ...
  }
}, [/* deps */]);
```

### State Lifting Pattern
```typescript
// App.tsx - Add deckVerbosity state
const [deckVerbosity, setDeckVerbosity] = useState<VerbosityLevel>('standard');

// App.tsx - Pass to PresentationView
<PresentationView
  slides={slides}
  deckVerbosity={deckVerbosity}
  onDeckVerbosityChange={setDeckVerbosity}
  // ... other props
/>

// PresentationView.tsx - Update props interface
interface PresentationViewProps {
  // ... existing props ...
  deckVerbosity: VerbosityLevel;
  onDeckVerbosityChange: (level: VerbosityLevel) => void;
}

// PresentationView.tsx - Use props instead of local state
const PresentationView: React.FC<PresentationViewProps> = ({
  deckVerbosity,
  onDeckVerbosityChange,
  // ... other props
}) => {
  // Remove: const [deckVerbosity, setDeckVerbosity] = useState<VerbosityLevel>('standard');
  // Use props: deckVerbosity and onDeckVerbosityChange instead
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store all state in localStorage | File-based persistence | Phase 19 | Portable, shareable presentations |
| Implicit defaults only | Optional fields with explicit defaults | Phase 28 v1->v2 | Backward compatibility |
| State per component | Lifted state for persistence | Standard React pattern | Consistent save/load |

**Deprecated/outdated:**
- Required fields for new features: Always use optional to maintain compatibility
- Component-local state for persisted data: Lift to container for save/load access

## Open Questions

### Question 1: Should 'standard' be stored explicitly?
**What we know:** 'standard' is the default. Omitting it reduces file size.
**What's unclear:** Is explicit storage clearer for debugging/inspection?
**Recommendation:** Omit when 'standard' (matches studentGrades pattern) - cleaner files

### Question 2: Verbosity selector in editing view?
**What we know:** Current selector is in PresentationView only
**What's unclear:** Should editing view show current deck verbosity?
**Recommendation:** Out of scope for PERS phase - focus on save/load persistence only

### Question 3: Cache preservation vs. regeneration on v2 load
**What we know:** v2 files may have verbosityCache but no deckVerbosity
**What's unclear:** Should app suggest regeneration for consistency?
**Recommendation:** Preserve cache silently. User can regenerate via deck toggle if desired.

## Sources

### Primary (HIGH confidence)
- `types.ts` - CueFile interface, CURRENT_FILE_VERSION = 2
- `services/loadService.ts` - migrateFile() pattern, readCueFile()
- `services/saveService.ts` - createCueFile() signature
- `components/PresentationView.tsx` - deckVerbosity state management
- `App.tsx` - handleLoadFile(), handleSaveClick() flows
- `.planning/phases/28-caching-backward-compatibility/28-01-PLAN.md` - v1->v2 migration pattern
- `.planning/phases/35-persistence/35-CONTEXT.md` - User decisions for this phase

### Secondary (MEDIUM confidence)
- Phase 34 implementation - deckVerbosity state structure in PresentationView
- VerbosityLevel type from geminiService.ts

### Tertiary (LOW confidence)
- None - all patterns verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components verified in codebase
- Architecture: HIGH - Follows established patterns from Phase 28
- Pitfalls: HIGH - Based on existing migration code and TypeScript constraints

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable internal architecture)

**Key files for implementation:**
- `types.ts` - CueFile interface, CURRENT_FILE_VERSION
- `services/loadService.ts` - migrateFile(), validation
- `services/saveService.ts` - createCueFile()
- `App.tsx` - State management, save/load handlers
- `components/PresentationView.tsx` - deckVerbosity consumer
