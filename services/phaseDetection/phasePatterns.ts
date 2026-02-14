/**
 * Phase synonym dictionary for UK/Australian teaching terminology.
 * Maps Gradual Release of Responsibility (GRR) phases to regex patterns
 * that detect phase boundaries in lesson plan text.
 *
 * Pattern types:
 * - Structural: Anchored to line start with heading/bullet prefix. High confidence.
 *   Must be followed by a delimiter (colon, dash, em-dash, newline).
 * - Content: Appear in body text of a section. Medium confidence.
 *
 * CRITICAL ordering: we-do-together BEFORE we-do in the array to ensure
 * longer matches are attempted first. Detection iterates in array order.
 *
 * Source: NSW Dept of Education, Third Space Learning, Brolga Education,
 *         v5.0 REQUIREMENTS.md (PHASE-01 through PHASE-07)
 */

import { LessonPhase } from '../../types';

/**
 * A pattern definition for a single lesson phase.
 * Structural patterns match headings/bullets at line start (high confidence).
 * Content patterns match body text indicators (medium confidence).
 */
export interface PhasePattern {
  phase: LessonPhase;
  /** Structural markers: must appear at start of line, heading, or after bullet */
  structuralPatterns: RegExp[];
  /** Content markers: appear within body text of a section */
  contentPatterns: RegExp[];
}

/**
 * Phase pattern dictionary ordered for correct matching priority.
 * IMPORTANT: we-do-together appears BEFORE we-do to prevent the shorter
 * "We Do" pattern from consuming "We Do Together" text.
 *
 * Array order: hook, i-do, we-do-together, we-do, you-do, plenary
 */
export const PHASE_PATTERNS: PhasePattern[] = [
  // -------------------------------------------------------------------------
  // HOOK / STARTER
  // -------------------------------------------------------------------------
  {
    phase: 'hook',
    structuralPatterns: [
      /^[\s*\-#]*(?:Hook|Starter|Warm[\s-]?Up|Do\s+Now|Engage|Opener|Activation|Tuning\s+In)\s*[:\-\u2013\u2014\n]/m,
    ],
    contentPatterns: [
      /what do you already know/i,
      /think[\s-]pair[\s-]share/i,
    ],
  },

  // -------------------------------------------------------------------------
  // I DO (MODELLING)
  // Case-sensitive structural pattern: "I Do" (title case) to prevent
  // false positives from "I do not recommend" etc.
  // -------------------------------------------------------------------------
  {
    phase: 'i-do',
    structuralPatterns: [
      // Case-sensitive "I Do" -- must be title case to avoid "I do not..."
      /^[\s*\-#]*I\s+Do\s*[:\-\u2013\u2014\n]/m,
      // Case-insensitive longer synonyms (these don't appear in casual English)
      /^[\s*\-#]*(?:Modell?(?:ed|ing)\s*(?:Practice)?|Direct\s+Instruction|Teacher\s+(?:Model(?:ling)?|Demonstrat(?:es?|ion))|Main\s+Teaching|Explicit\s+Teaching|Explicit\s+Instruction|Input)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /watch (?:how|me|carefully)/i,
      /let me show you/i,
      /teacher (?:models?|explains?|demonstrates?)/i,
    ],
  },

  // -------------------------------------------------------------------------
  // WE DO TOGETHER (must come BEFORE we-do)
  // -------------------------------------------------------------------------
  {
    phase: 'we-do-together',
    structuralPatterns: [
      /^[\s*\-#]*(?:We\s+Do\s+Together|Collaborative\s+Practice|Partner\s+(?:Work|Practice|Activity)|Peer\s+Practice|You\s+Do\s+Together|Group\s+(?:Work|Activity|Practice))\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /with (?:your|a) partner/i,
      /in (?:your|small) groups?/i,
      /discuss with (?:your|a) (?:partner|neighbour|neighbor)/i,
    ],
  },

  // -------------------------------------------------------------------------
  // WE DO (GUIDED PRACTICE)
  // -------------------------------------------------------------------------
  {
    phase: 'we-do',
    structuralPatterns: [
      /^[\s*\-#]*(?:We\s+Do|Guided\s+Practice|Shared\s+(?:Practice|Activity|Writing)|Joint\s+(?:Activity|Construction)|Together\s+Time)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /(?:work|do this|try this|let's try) together/i,
      /as a (?:class|group|whole class)/i,
    ],
  },

  // -------------------------------------------------------------------------
  // YOU DO (INDEPENDENT PRACTICE)
  // -------------------------------------------------------------------------
  {
    phase: 'you-do',
    structuralPatterns: [
      /^[\s*\-#]*(?:You\s+Do|Independent\s+Practice|Independent\s+(?:Work|Activity|Task)|Your\s+Turn|Applying|Application|Student\s+Activity|On\s+Your\s+Own)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /on your own/i,
      /independently/i,
      /complete the (?:task|activity|worksheet|exercise)/i,
    ],
  },

  // -------------------------------------------------------------------------
  // PLENARY / REVIEW
  // -------------------------------------------------------------------------
  {
    phase: 'plenary',
    structuralPatterns: [
      /^[\s*\-#]*(?:Plenary|Review|Recap|Reflect(?:ion)?|Summar(?:y|ise|ize)|Closing|Wrap[\s-]?Up|Exit\s+Ticket|Self[\s-]?Assessment|Debrief|Consolidat(?:e|ion))\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /what (?:did we|have we|have you) learn/i,
      /key takeaway/i,
      /today we (?:learned|learnt|explored|discovered)/i,
      /thumbs up/i,
    ],
  },
];

/**
 * Human-readable display labels for each lesson phase.
 * Used in UI badges, tooltips, and phase indicators.
 */
export const PHASE_DISPLAY_LABELS: Record<LessonPhase, string> = {
  'hook': 'Hook / Starter',
  'i-do': 'I Do (Modelling)',
  'we-do': 'We Do (Guided)',
  'we-do-together': 'We Do Together',
  'you-do': 'You Do (Independent)',
  'plenary': 'Plenary / Review',
};

/**
 * Tailwind color classes for phase badges and indicators.
 * Each phase has light and dark mode variants for background and text.
 * darkBg and darkText use Tailwind's dark: prefix classes.
 */
export const PHASE_COLORS: Record<LessonPhase, { bg: string; text: string; darkBg: string; darkText: string }> = {
  'hook':            { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-400' },
  'i-do':            { bg: 'bg-blue-100',    text: 'text-blue-700',    darkBg: 'dark:bg-blue-900/40',    darkText: 'dark:text-blue-400' },
  'we-do':           { bg: 'bg-violet-100',  text: 'text-violet-700',  darkBg: 'dark:bg-violet-900/40',  darkText: 'dark:text-violet-400' },
  'we-do-together':  { bg: 'bg-purple-100',  text: 'text-purple-700',  darkBg: 'dark:bg-purple-900/40',  darkText: 'dark:text-purple-400' },
  'you-do':          { bg: 'bg-amber-100',   text: 'text-amber-700',   darkBg: 'dark:bg-amber-900/40',   darkText: 'dark:text-amber-400' },
  'plenary':         { bg: 'bg-rose-100',    text: 'text-rose-700',    darkBg: 'dark:bg-rose-900/40',    darkText: 'dark:text-rose-400' },
};
