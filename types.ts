import { QuizQuestion } from './services/geminiService';
import { VerbosityLevel } from './services/aiProvider';

export interface Slide {
  id: string;
  title: string;
  content: string[]; // Bullet points
  speakerNotes: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  layout?: 'split' | 'full-image' | 'center-text' | 'flowchart' | 'grid' | 'tile-overlap' | 'work-together' | 'class-challenge';
  theme?: 'default' | 'purple' | 'blue' | 'green' | 'warm';
  backgroundColor?: string;
  hasQuestionFlag?: boolean;
  // Verbosity cache for on-demand regenerated scripts
  // Standard is speakerNotes; only cache concise/detailed
  verbosityCache?: {
    concise?: string;
    detailed?: string;
  };
  // Slide type indicator for UI badges (optional, defaults to standard)
  slideType?: 'standard' | 'elaborate' | 'work-together' | 'class-challenge';
  // For Work Together slides: randomized student pairs
  pairs?: StudentPair[];
  // For Class Challenge slides: live student contributions
  contributions?: string[];
  challengePrompt?: string;
}

// AI Poster types for Working Wall export
export interface PosterLayout {
  title: string;              // Enhanced title (not verbatim from slide)
  subtitle?: string;          // Optional context/hook
  sections: PosterSection[];  // 5-8 content sections
  colorScheme: {
    primary: string;          // Hex code for headers, accents
    secondary: string;        // Hex code for subheadings
    background: string;       // Hex code for poster background
    text: string;             // Hex code for body text
  };
  typography: {
    titleSize: 'large' | 'xl' | '2xl';
    bodyFormat: 'bullets' | 'paragraphs' | 'mixed';
  };
}

export interface PosterSection {
  heading?: string;           // Optional section heading
  content: string;            // Main content (enhanced from slide)
  format: 'bullet' | 'paragraph' | 'callout';  // How to display
  emphasis?: boolean;         // Should this stand out? (colored background, border)
}

// Student pairs for Work Together slides
// Stored separately from content so shuffle doesn't require AI regeneration
export interface StudentPair {
  students: string[];      // 2 or 3 student names
  isGroupOfThree?: boolean;
}

// BroadcastChannel configuration for dual-window sync
export const BROADCAST_CHANNEL_NAME = 'pipi-presentation';

// State synchronized between teacher and student windows
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
}

// ============================================================================
// UNIFIED GAME TYPE SYSTEM
// ============================================================================

// Game type union - all supported game formats
export type GameType = 'quick-quiz' | 'millionaire' | 'the-chase' | 'beat-the-chaser';

// Game difficulty presets for AI question generation
export type GameDifficulty = 'easy' | 'medium' | 'hard';

// Competition mode for team/individual play
export interface Team {
  id: string;      // crypto.randomUUID()
  name: string;
  score: number;
}

export type CompetitionMode =
  | { mode: 'individual'; playerName: string }
  | { mode: 'team'; teams: Team[]; activeTeamIndex: number };

// Game status state machine
export type GameStatus = 'loading' | 'splash' | 'playing' | 'reveal' | 'result';

// Base properties shared across all game types
export interface BaseGameState {
  gameType: GameType;
  status: GameStatus;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  competitionMode?: CompetitionMode;  // Optional for backward compatibility
}

// Quick Quiz state (Kahoot-style)
export interface QuickQuizState extends BaseGameState {
  gameType: 'quick-quiz';
  isAnswerRevealed: boolean;
}

// Millionaire state (15 questions to the top)
export interface MillionaireState extends BaseGameState {
  gameType: 'millionaire';
  selectedOption: number | null;
  lifelines: {
    fiftyFifty: boolean;
    phoneAFriend: boolean;
    askTheAudience: boolean;
  };
  prizeLadder: number[];
  currentPrize: number;
  eliminatedOptions: number[]; // Indices hidden by 50:50 lifeline
  audiencePoll: [number, number, number, number] | null; // A, B, C, D percentages (0-100)
  phoneHint: { confidence: 'high' | 'medium' | 'low'; response: string } | null;
  safeHavenAmount: number; // Current guaranteed minimum prize
  questionCount: 3 | 5 | 10; // Selected at game launch
}

// The Chase game phase union
export type ChasePhase =
  | 'cash-builder'
  | 'offer-selection'
  | 'head-to-head'
  | 'final-chase-contestant'
  | 'final-chase-chaser'
  | 'game-over';

// Chase offer structure for offer selection phase
export interface ChaseOffer {
  amount: number;      // Prize money
  position: number;    // Starting position (1-5, where 3 is middle)
  label: string;       // "High Offer (+2 steps)" etc
}

// The Chase state (outrun the chaser)
export interface TheChaseState extends BaseGameState {
  gameType: 'the-chase';
  phase: ChasePhase;
  // Cash Builder state
  cashBuilderScore: number;
  cashBuilderTimeRemaining: number;
  // Offer state
  offers: ChaseOffer[];
  selectedOfferIndex: number | null;
  votes: Record<string, number>;  // studentName -> offerIndex
  isVotingOpen: boolean;
  // Head-to-Head state
  contestantPosition: number;  // 0-6 (0=top, 6=home)
  chaserPosition: number;      // 0-6
  chaserDifficulty: 'easy' | 'medium' | 'hard';
  isAIControlled: boolean;
  isChaserThinking: boolean;
  // Final Chase state
  finalChaseContestantScore: number;  // Questions answered
  finalChaseContestantTime: number;   // Seconds remaining
  finalChaseChaserScore: number;
  finalChaseChaserTime: number;
  chaserTargetScore: number;  // Score needed to catch (contestant's final score)
  // Question state
  currentQuestionAnswered: boolean;
  contestantAnswer: number | null;
  chaserAnswer: number | null;
  showChaserAnswer: boolean;
  // Legacy backward compatibility fields
  isChasing: boolean;
}

// Beat the Chaser game phase union
export type BeatTheChaserPhase = 'setup' | 'cash-builder' | 'timed-battle' | 'game-over';

// Beat the Chaser state (race against time)
export interface BeatTheChaserState extends BaseGameState {
  gameType: 'beat-the-chaser';
  phase: BeatTheChaserPhase;
  // Cash Builder state
  accumulatedTime: number; // Seconds earned in Cash Builder (5s per correct)
  cashBuilderQuestionsAnswered: number;
  cashBuilderCorrectAnswers: number;
  // Timed Battle state
  contestantTime: number;
  chaserTime: number;
  activePlayer: 'contestant' | 'chaser';
  chaserDifficulty: 'easy' | 'medium' | 'hard';
  isAIControlled: boolean;
  // Question state
  contestantAnswer: number | null;
  chaserAnswer: number | null;
  showTimeBonusEffect: boolean; // For +5s animation trigger
  // Game outcome
  winner: 'contestant' | 'chaser' | null;
}

// Unified game state discriminated union
export type GameState =
  | QuickQuizState
  | MillionaireState
  | TheChaseState
  | BeatTheChaserState;

// Helper type for nullable game state
export type ActiveGameState = GameState | null;

// Exhaustive type checking helper
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

// ============================================================================
// LEGACY TYPES (for backward compatibility - will be removed in Plan 02)
// ============================================================================

// Game state synchronized from teacher to student view
// Note: Only sync 'loading', 'play', 'summary' modes - NOT 'setup' (teacher-only configuration screen)
export interface GameSyncState {
  mode: 'loading' | 'play' | 'summary';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  isAnswerRevealed: boolean;
}

// Discriminated union for type-safe message handling
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' }
  | { type: 'GAME_STATE_UPDATE'; payload: GameState }
  | { type: 'GAME_CLOSE' }
  | { type: 'STUDENT_SELECT'; payload: { studentName: string } }
  | { type: 'STUDENT_CLEAR' };

export interface LessonResource {
  id: string;
  title: string;
  type: 'worksheet' | 'handout' | 'guide' | 'list' | 'quiz';
  targetAudience: 'student' | 'teacher' | 'support' | 'extension';
  content: string; // Markdown formatted content
  imagePrompt?: string; // Prompt for the header visual
  imageUrl?: string;    // The generated image
  isGeneratingImage?: boolean; // Tracking state
}

// ============================================================================
// UPLOADED RESOURCE TYPES (Phase 43+)
// For AI enhancement of teacher-provided documents
// ============================================================================

// Uploaded resource file type
export type UploadedResourceType = 'pdf' | 'image' | 'docx';

// Uploaded resource for AI enhancement
export interface UploadedResource {
  id: string;                    // crypto.randomUUID()
  filename: string;              // Original filename
  type: UploadedResourceType;
  thumbnail: string;             // Base64 data URL
  pageCount: number;             // Actual for PDF, 1 for images, estimate for docx
  sizeBytes: number;
  uploadedAt: string;            // ISO 8601
  // Raw content for AI processing (populated during enhancement phase)
  content?: {
    text?: string;               // Extracted text (all types)
    images?: string[];           // Page images as base64 (PDF only)
  };
}

// Upload validation error
export interface UploadValidationError {
  code: 'FILE_TOO_LARGE' | 'TOO_MANY_PAGES' | 'UNSUPPORTED_TYPE' | 'PROCESSING_ERROR';
  message: string;
}

// ============================================================================
// DOCUMENT ANALYSIS TYPES (Phase 44)
// For AI-powered structure detection and content extraction
// ============================================================================

// Document classification types
export type DocumentClassification = 'worksheet' | 'handout' | 'quiz' | 'activity' | 'assessment' | 'other';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Structural element types detected in documents
export type ElementType =
  | 'header'
  | 'subheader'
  | 'paragraph'
  | 'question'
  | 'answer'
  | 'instruction'
  | 'table'
  | 'diagram'
  | 'image'
  | 'list'
  | 'blank-space';

// Individual detected element in document
export interface AnalyzedElement {
  type: ElementType;
  content: string;           // Full text, or caption for visual elements
  position: number;          // Order in document (0-indexed)
  visualContent?: boolean;   // True if needs manual review during enhancement
  children?: string[];       // For lists, numbered items, or multi-part questions
  tableData?: {              // For tables only
    headers: string[];
    rows: string[][];
  };
}

// Complete document analysis result
export interface DocumentAnalysis {
  // Classification
  documentType: DocumentClassification;
  documentTypeConfidence: ConfidenceLevel;
  alternativeTypes?: DocumentClassification[]; // If confidence not high, top 2-3 alternatives

  // Metadata
  title: string;
  pageCount: number;
  hasAnswerKey: boolean;

  // Detected elements in document order
  elements: AnalyzedElement[];

  // Visual content summary
  visualContentCount: number; // Number of diagrams/images flagged for review
}

// ============================================================================
// DOCUMENT ENHANCEMENT TYPES (Phase 45)
// For AI-powered differentiation, slide alignment, and answer key generation
// ============================================================================

// Slide match result from AI alignment detection
export interface SlideMatch {
  slideIndex: number;                          // 0-indexed slide number
  slideTitle: string;                          // For display in confirmation UI
  relevanceScore: 'high' | 'medium' | 'low';
  reason: string;                              // Brief explanation for teacher
}

// Enhanced element (mirrors AnalyzedElement with enhancements)
export interface EnhancedElement {
  type: ElementType;
  originalContent: string;    // Preserved from analysis
  enhancedContent: string;    // May differ based on level
  position: number;
  visualContent?: boolean;    // Preserved - signals "don't modify"
  slideReference?: string;    // Added: "See Slide 5 (Fractions)"
  children?: string[];        // For lists, numbered items, or multi-part questions
  tableData?: {               // For tables only
    headers: string[];
    rows: string[][];
  };
}

// Single differentiated version of a resource
export interface DifferentiatedVersion {
  level: 'simple' | 'standard' | 'detailed';
  title: string;              // May be enhanced from original
  alignedSlides: number[];    // 1-indexed slide numbers this relates to
  slideAlignmentNote: string; // e.g., "Worksheet 1 aligns with Slides 5-7"
  elements: EnhancedElement[];
}

// Answer key item for a single question/exercise
export interface AnswerKeyItem {
  questionRef: string;        // e.g., "Question 1" or "Exercise A, part 2"
  type: 'closed' | 'open-ended';
  // For closed questions (specific answer)
  answer?: string;
  // For open-ended questions (rubric)
  rubric?: {
    criteria: string[];       // What to look for
    exemplar?: string;        // Example good answer
    commonMistakes?: string[]; // What to watch for
  };
}

// Answer key for one or all differentiation levels
export interface AnswerKey {
  level?: 'simple' | 'standard' | 'detailed';  // If per-level
  items: AnswerKeyItem[];
}

// Answer key result with structure decision
export interface AnswerKeyResult {
  structure: 'unified' | 'per-level';
  keys: AnswerKey[];
}

// Complete enhancement result from AI
export interface EnhancementResult {
  slideMatches: SlideMatch[];      // Which slides this resource aligns with
  versions: {
    simple: DifferentiatedVersion;
    standard: DifferentiatedVersion;
    detailed: DifferentiatedVersion;
  };
  answerKeys: AnswerKeyResult;
}

// Options for enhancement operation
export interface EnhancementOptions {
  preserveMode: boolean;      // true = preserve original, false = allow modification (future)
  generateAnswerKey: boolean; // ENHANCE-04
  gradeLevel: string;         // e.g., "Year 6 (10-11 years old)"
}

// ============================================================================
// EDIT STATE TYPES (Phase 46)
// For tracking user modifications to enhanced content
// ============================================================================

// Edit state for tracking user modifications to enhanced content
export type EditAction =
  | { type: 'EDIT_ELEMENT'; level: 'simple' | 'standard' | 'detailed'; position: number; content: string }
  | { type: 'REVERT_ELEMENT'; level: 'simple' | 'standard' | 'detailed'; position: number }
  | { type: 'DISCARD_ALL' };

export interface EditState {
  // Map: level -> (position -> edited content)
  edits: Record<'simple' | 'standard' | 'detailed', Map<number, string>>;
}

// Serializable edit state (Map doesn't serialize to JSON)
export interface SerializedEditState {
  simple: [number, string][];   // Array of [position, content] tuples
  standard: [number, string][];
  detailed: [number, string][];
}

// Enhanced resource state for .cue file persistence
export interface EnhancedResourceState {
  resourceId: string;                    // Links to UploadedResource.id
  originalResource: UploadedResource;    // Full resource data
  analysis: DocumentAnalysis;            // Cached analysis
  enhancementResult: EnhancementResult;  // All three versions + answer keys
  editOverlays: SerializedEditState;     // User edits stored separately
  enhancedAt: string;                    // ISO 8601 timestamp
}

export interface LessonPlan {
  topic: string;
  gradeLevel: string; // Defaults to "Year 6" (10-11yo)
  slides: Slide[];
}

// AI Provider configuration for multi-provider support
// Note: OpenAI removed - doesn't support browser CORS
export type AIProvider = 'gemini' | 'claude';

export interface Settings {
  provider: AIProvider;
  apiKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  apiKey: '',
};

// File format version - increment on breaking changes
export const CURRENT_FILE_VERSION = 4;

// Content structure stored in .cue files
export interface CueFileContent {
  slides: Slide[];
  studentNames: string[];
  lessonText: string;
  studentGrades?: StudentWithGrade[];  // Optional for backward compatibility
  enhancedResources?: EnhancedResourceState[];  // NEW in v4
}

// .cue file format with version metadata
export interface CueFile {
  version: number;
  createdAt: string; // ISO 8601
  modifiedAt: string; // ISO 8601
  title: string;
  author?: string;
  deckVerbosity?: VerbosityLevel;
  content: CueFileContent;
}

// Class Bank - saved student lists
export interface SavedClass {
  id: string;           // crypto.randomUUID()
  name: string;         // User-provided name (trimmed)
  students: string[];   // Array of student names (kept for backward compatibility)
  studentData?: StudentWithGrade[]; // Grade assignments (optional for migration)
  savedAt: string;      // ISO 8601 timestamp
}

// Student grade levels for targeted questioning
export type GradeLevel = 'A' | 'B' | 'C' | 'D' | 'E';

// Student with optional grade assignment
export interface StudentWithGrade {
  name: string;
  grade: GradeLevel | null;
}

export enum AppState {
  INPUT = 'INPUT',
  PROCESSING_TEXT = 'PROCESSING_TEXT',
  EDITING = 'EDITING',
  PRESENTING = 'PRESENTING',
}

// Global definition for PptxGenJS loaded via script tag
declare global {
  interface Window {
    PptxGenJS: any;
    // Window Management API (experimental, Chromium-only)
    getScreenDetails?(): Promise<ScreenDetails>;
  }

  // Window Management API types (experimental, not in lib.dom.d.ts)
  // Source: W3C Window Management Spec, MDN

  /**
   * Extended screen information available through the Window Management API.
   * Provides detailed positioning and identification for each connected display.
   */
  interface ScreenDetailed extends Screen {
    /** Left edge of available area (excludes taskbar/dock) */
    readonly availLeft: number;
    /** Top edge of available area (excludes taskbar/dock) */
    readonly availTop: number;
    /** Left edge of total screen area */
    readonly left: number;
    /** Top edge of total screen area */
    readonly top: number;
    /** Whether this is the primary/main display */
    readonly isPrimary: boolean;
    /** Whether this is an internal display (e.g., laptop screen) */
    readonly isInternal: boolean;
    /** Device pixel ratio for this screen */
    readonly devicePixelRatio: number;
    /** Human-readable label (e.g., "Built-in Display", "DELL U2718Q") */
    readonly label: string;
  }

  /**
   * Container for all connected screens, with events for configuration changes.
   */
  interface ScreenDetails extends EventTarget {
    /** All connected screens */
    readonly screens: ReadonlyArray<ScreenDetailed>;
    /** The screen containing the current window */
    readonly currentScreen: ScreenDetailed;
    addEventListener(type: 'screenschange', listener: () => void): void;
    addEventListener(type: 'currentscreenchange', listener: () => void): void;
    removeEventListener(type: 'screenschange', listener: () => void): void;
    removeEventListener(type: 'currentscreenchange', listener: () => void): void;
  }

  /**
   * Extends the built-in Screen interface with multi-screen detection.
   * isExtended is available WITHOUT permission - use for feature detection.
   */
  interface Screen {
    /** True when multiple screens are connected (no permission needed) */
    readonly isExtended?: boolean;
  }
}

// --- Tour State ---

/** Valid tour identifiers - one per screen */
export type TourId = 'landing' | 'editor' | 'presentation';

/** Tour completion state persisted to localStorage */
export interface TourState {
  /** Tour IDs that user has completed */
  completedTours: TourId[];
  /** Timestamp when tour was last dismissed (for "remind me later" if needed) */
  lastDismissed: Partial<Record<TourId, number>>;
}

/** Default tour state for new users */
export const DEFAULT_TOUR_STATE: TourState = {
  completedTours: [],
  lastDismissed: {},
};
