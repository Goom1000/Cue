import { CueFile, CURRENT_FILE_VERSION } from '../types';

/**
 * Type guard to validate that parsed data has the expected CueFile shape.
 * Follows existing isValidSettings pattern from useSettings.ts.
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid CueFile
 */
export function isValidCueFile(data: unknown): data is CueFile {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Validate version is a number
  if (typeof obj.version !== 'number') return false;

  // Validate title is a string
  if (typeof obj.title !== 'string') return false;

  // Validate content is an object
  if (typeof obj.content !== 'object' || obj.content === null) return false;

  const content = obj.content as Record<string, unknown>;

  // Validate content.slides is an array
  if (!Array.isArray(content.slides)) return false;

  // Validate optional studentGrades if present
  if (content.studentGrades !== undefined) {
    if (!Array.isArray(content.studentGrades)) return false;
    // Shallow validation - detailed validation happens in useClassBank
  }

  return true;
}

/**
 * Migrate file data from older versions to current version.
 * Currently a no-op since version 1 is current; kept as future-proofing.
 *
 * @param data - CueFile with potentially older version
 * @returns Migrated CueFile at CURRENT_FILE_VERSION
 */
function migrateFile(data: CueFile): CueFile {
  const fromVersion = data.version;

  if (fromVersion < CURRENT_FILE_VERSION) {
    console.log(`Migrating file from version ${fromVersion} to ${CURRENT_FILE_VERSION}`);
    // v1 -> v2: Added verbosityCache to Slide interface
    // No action needed - optional field defaults to undefined
    if (fromVersion === 1) {
      // Slides without verbosityCache will have it as undefined
      // This is correct behavior - cache is populated on-demand
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

/**
 * Read and parse a .cue or .pipi file from a File object.
 *
 * Validates file extension, parses JSON, validates structure,
 * and migrates from older versions if needed.
 *
 * @param file - File object from file input or drag-drop
 * @returns Promise resolving to validated CueFile
 * @throws Error with user-friendly message on validation failure
 */
export function readCueFile(file: File): Promise<CueFile> {
  return new Promise((resolve, reject) => {
    // Validate file extension - accept both .cue and .pipi for backward compatibility
    const isValidExtension = file.name.endsWith('.cue') || file.name.endsWith('.pipi');
    if (!isValidExtension) {
      reject(new Error('Invalid file type. Expected .cue or .pipi file.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        // Parse JSON
        const data = JSON.parse(reader.result as string);

        // Validate structure
        if (!isValidCueFile(data)) {
          reject(new Error('File format is corrupted or incompatible.'));
          return;
        }

        // Migrate from older versions if needed
        const migratedData = data.version < CURRENT_FILE_VERSION
          ? migrateFile(data)
          : data;

        resolve(migratedData);
      } catch (e) {
        // JSON parse error
        reject(new Error('File contains invalid JSON.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.readAsText(file);
  });
}
