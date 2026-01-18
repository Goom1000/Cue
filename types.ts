
export interface Slide {
  id: string;
  title: string;
  content: string[]; // Bullet points
  speakerNotes: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  layout?: 'split' | 'full-image' | 'center-text' | 'flowchart' | 'grid' | 'tile-overlap';
  theme?: 'default' | 'purple' | 'blue' | 'green' | 'warm';
  backgroundColor?: string;
  hasQuestionFlag?: boolean;
}

// BroadcastChannel configuration for dual-window sync
export const BROADCAST_CHANNEL_NAME = 'pipi-presentation';

// State synchronized between teacher and student windows
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
}

// Discriminated union for type-safe message handling
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' };

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

export interface LessonPlan {
  topic: string;
  gradeLevel: string; // Defaults to "Year 6" (10-11yo)
  slides: Slide[];
}

// AI Provider configuration for multi-provider support
export type AIProvider = 'gemini' | 'openai' | 'claude';

export interface Settings {
  provider: AIProvider;
  apiKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  apiKey: '',
};

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
