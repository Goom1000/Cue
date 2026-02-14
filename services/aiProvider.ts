import { Slide, LessonResource, AIProvider, GameType, GameDifficulty, DocumentAnalysis, EnhancementResult, EnhancementOptions } from '../types';
import { ImageCaptionResult } from './slideAnalysis/slideAnalysisPrompts';

// Re-export ImageCaptionResult for consumers
export type { ImageCaptionResult } from './slideAnalysis/slideAnalysisPrompts';
import { QuizQuestion, QuestionWithAnswer, VerbosityLevel } from './geminiService';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';

// Re-export VerbosityLevel for consumers
export type { VerbosityLevel } from './geminiService';

// AI Transformation types for colleague-deliverable talking-point bullets (Phase 61)
export interface TransformedSlide {
  slideIndex: number;        // 0-indexed position in original deck
  originalTitle: string;     // Slide title for reference
  expandedBullets: string[]; // The transformed talking-point bullets
  slideType: string;         // 'standard' | 'elaborate' | 'work-together' | 'class-challenge' | 'pasted'
}

export interface ColleagueTransformationResult {
  slides: TransformedSlide[];
  skippedCount: number;      // Slides with no teleprompter content
}

// Deck Condensation types for lesson-plan-aware slide reduction (Phase 60)
export type CondensationAction = 'keep' | 'remove' | 'merge';

export interface CondensationSlideAction {
  slideIndex: number;
  action: CondensationAction;
  reason: string;
  // For 'merge': target slide absorbs these source slides
  mergeWithSlideIndices?: number[];
}

export interface CondensationResult {
  actions: CondensationSlideAction[];
  summary: string;
  originalSlideCount: number;
  proposedSlideCount: number;
  essentialTopicsPreserved: string[];
}

// Gap Analysis types for deck-vs-lesson-plan comparison (Phase 59)
export type GapSeverity = 'critical' | 'recommended' | 'nice-to-have';

export interface IdentifiedGap {
  id: string;
  topic: string;
  description: string;
  severity: GapSeverity;
  suggestedTitle: string;
  suggestedContent: string[];
  suggestedPosition: number;
  relatedLessonPlanExcerpt: string;
}

export interface GapAnalysisResult {
  gaps: IdentifiedGap[];
  summary: string;
  coveragePercentage: number;
}

// Generation mode types for multi-source slide generation
export type GenerationMode = 'fresh' | 'refine' | 'blend';

export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;
  gradeLevel?: string;  // e.g., "Year 6 (10-11 years old)"
  supplementaryResourceText?: string;  // Capped resource text for prompt injection (Pass 1 only)
}

// Context from slides for question generation
export interface SlideContext {
  lessonTopic: string;           // From first slide title
  cumulativeContent: string;     // All slides up to current, formatted
  currentSlideTitle: string;     // Current slide title
  currentSlideContent: string[]; // Current slide bullets
}

// Context for Ask AI chat feature
export interface ChatContext {
  lessonTopic: string;           // From first slide title
  currentSlideTitle: string;     // Current slide title
  currentSlideContent: string[]; // Current slide bullets
  cumulativeContent: string;     // All slides up to current, formatted
  gradeLevel: string;            // For age-appropriate responses (e.g., "Year 6", "10-11 years old")
}

// Request structure for game-specific question generation
export interface GameQuestionRequest {
  gameType: 'millionaire' | 'the-chase' | 'beat-the-chaser';
  difficulty: GameDifficulty;    // For Chase/Beat the Chaser (ignored for Millionaire)
  questionCount: number;         // 3/5/10 for Millionaire, ~10 for Chase
  slideContext: SlideContext;
  optionalHints?: string;        // Teacher's focus hints ("focus on vocabulary")
}

// Bloom's taxonomy mapping for consistent difficulty calibration
export const BLOOM_DIFFICULTY_MAP = {
  easy: {
    levels: ['Remember', 'Understand'],
    questionTypes: '"What is...", "Name the...", "Give an example of..."',
    description: 'Basic recall and comprehension questions'
  },
  medium: {
    levels: ['Apply', 'Analyze'],
    questionTypes: '"How would you...", "What would happen if...", "Compare..."',
    description: 'Application and analysis questions'
  },
  hard: {
    levels: ['Evaluate', 'Create'],
    questionTypes: '"Why does X affect Y?", "What is the best strategy for..."',
    description: 'Evaluation and synthesis questions requiring reasoning'
  }
} as const;

// Helper to build slide context for question generation
export function buildSlideContext(slides: Slide[], currentIndex: number): SlideContext {
  const relevantSlides = slides.slice(0, currentIndex + 1);
  const cumulativeContent = relevantSlides
    .map((s, i) => `Slide ${i + 1} (${s.title}): ${s.content.join('; ')}`)
    .join('\n\n');

  return {
    lessonTopic: slides[0]?.title || 'Unknown Topic',
    cumulativeContent,
    currentSlideTitle: slides[currentIndex]?.title || 'Current Slide',
    currentSlideContent: slides[currentIndex]?.content || []
  };
}

// Helper to build chat context for Ask AI feature
export function buildChatContext(
  slides: Slide[],
  currentIndex: number,
  gradeLevel: string
): ChatContext {
  const relevantSlides = slides.slice(0, currentIndex + 1);
  const cumulativeContent = relevantSlides
    .map((s, i) => `Slide ${i + 1} (${s.title}): ${s.content.join('; ')}`)
    .join('\n\n');

  return {
    lessonTopic: slides[0]?.title || 'Unknown Topic',
    currentSlideTitle: slides[currentIndex]?.title || 'Current Slide',
    currentSlideContent: slides[currentIndex]?.content || [],
    cumulativeContent,
    gradeLevel,
  };
}

/**
 * Build formatted slide context for document enhancement.
 * Limits to first 15 slides to avoid token overflow.
 * @param slides - All lesson slides
 * @returns Formatted string with slide titles and content
 */
export function buildSlideContextForEnhancement(slides: Slide[]): string {
  // Handle empty or undefined slides
  if (!slides || slides.length === 0) {
    return '[No slides available - enhance document without slide alignment]';
  }

  const MAX_SLIDES = 15;
  const slidesToInclude = slides.slice(0, MAX_SLIDES);
  const truncated = slides.length > MAX_SLIDES;

  const formatted = slidesToInclude.map((slide, index) => {
    const bullets = slide.content?.slice(0, 5).join('; ') || '';
    return `Slide ${index + 1}: '${slide.title || 'Untitled'}'\nContent: ${bullets}`;
  }).join('\n\n---\n\n');

  if (truncated) {
    return `${formatted}\n\n[Showing first ${MAX_SLIDES} of ${slides.length} slides]`;
  }

  return formatted;
}

/**
 * Shuffle quiz question options so correct answer isn't always "A".
 * Uses Fisher-Yates shuffle and updates correctAnswerIndex accordingly.
 */
export function shuffleQuestionOptions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map(q => {
    // Create array of indices [0, 1, 2, 3]
    const indices = q.options.map((_, i) => i);

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Reorder options according to shuffled indices
    const shuffledOptions = indices.map(i => q.options[i]);

    // Find new position of correct answer
    const newCorrectIndex = indices.indexOf(q.correctAnswerIndex);

    return {
      ...q,
      options: shuffledOptions,
      correctAnswerIndex: newCorrectIndex
    };
  });
}

// Helper for auto-retry with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (e) {
      lastError = e as Error;

      // Only retry on transient errors
      if (e instanceof AIProviderError) {
        const retryableCodes: AIErrorCode[] = ['NETWORK_ERROR', 'RATE_LIMIT', 'SERVER_ERROR'];
        if (!retryableCodes.includes(e.code)) {
          throw e; // Don't retry AUTH_ERROR, PARSE_ERROR, etc.
        }
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

// Error codes for unified error handling across all providers
export type AIErrorCode =
  | 'RATE_LIMIT'           // 429 - too many requests
  | 'QUOTA_EXCEEDED'       // 429 - billing/usage limit
  | 'AUTH_ERROR'           // 401/403 - invalid key
  | 'SERVER_ERROR'         // 500/503/529 - provider issues
  | 'NETWORK_ERROR'        // Connection failed
  | 'PROVIDER_NOT_SUPPORTED' // OpenAI in browser
  | 'PARSE_ERROR'          // Response parsing failed
  | 'UNKNOWN_ERROR';       // Catch-all

// User-friendly error messages mapped by error code
export const USER_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  QUOTA_EXCEEDED: 'Usage limit reached. Please check your billing settings with your AI provider.',
  AUTH_ERROR: 'Invalid API key. Please check your settings.',
  SERVER_ERROR: 'The AI service is temporarily unavailable. Please try again later.',
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  PROVIDER_NOT_SUPPORTED: 'This AI provider is not available for browser use. Please select Gemini or Claude.',
  PARSE_ERROR: 'Failed to process the AI response. Please try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

// Unified error class for all AI provider errors
export class AIProviderError extends Error {
  public readonly userMessage: string;
  public readonly code: AIErrorCode;
  public readonly originalError?: unknown;

  constructor(userMessage: string, code: AIErrorCode, originalError?: unknown) {
    super(userMessage);
    this.name = 'AIProviderError';
    this.userMessage = userMessage;
    this.code = code;
    this.originalError = originalError;
  }
}

// Interface all AI providers must implement
export interface AIProviderInterface {
  // Accepts either new GenerationInput or old (string, string[]) signature for backward compatibility
  generateLessonSlides(
    inputOrText: GenerationInput | string,
    pageImages?: string[],
    signal?: AbortSignal
  ): Promise<Slide[]>;
  generateSlideImage(imagePrompt: string, layout?: string): Promise<string | undefined>;
  generateResourceImage(imagePrompt: string): Promise<string | undefined>;
  generateQuickQuestion(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'Grade C' | 'Grade B' | 'Grade A'
  ): Promise<string>;
  reviseSlide(slide: Slide, instruction: string): Promise<Partial<Slide>>;
  generateContextualSlide(
    lessonTopic: string,
    userInstruction: string,
    prevSlide?: Slide,
    nextSlide?: Slide
  ): Promise<Slide>;
  generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide>;
  generateElaborateSlide(
    lessonTopic: string,
    sourceSlide: Slide,
    allSlides: Slide[]
  ): Promise<Slide>;
  generateWorkTogetherSlide(
    lessonTopic: string,
    sourceSlide: Slide,
    allSlides: Slide[]
  ): Promise<Slide>;
  generateClassChallengeSlide(
    lessonTopic: string,
    sourceSlide: Slide,
    allSlides: Slide[]
  ): Promise<Slide>;
  generateLessonResources(lessonText: string, slideContext: string): Promise<LessonResource[]>;
  generateImpromptuQuiz(
    slides: Slide[],
    currentIndex: number,
    numQuestions?: number
  ): Promise<QuizQuestion[]>;
  generateQuestionWithAnswer(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'A' | 'B' | 'C' | 'D' | 'E'
  ): Promise<QuestionWithAnswer>;
  // Game-specific question generation with difficulty progression
  generateGameQuestions(
    request: GameQuestionRequest
  ): Promise<QuizQuestion[]>;
  // Regenerate teleprompter script at specified verbosity level
  regenerateTeleprompter(
    slide: Slide,
    verbosity: VerbosityLevel,
    prevSlide?: Slide,
    nextSlide?: Slide
  ): Promise<string>;
  // Ask AI: streaming chat response
  streamChat(
    message: string,
    context: ChatContext
  ): AsyncGenerator<string, void, unknown>;

  // Document analysis for resource enhancement (Phase 44)
  analyzeDocument(
    documentImages: string[],   // Base64 images (pages or single image, no data URL prefix)
    documentText: string,       // Extracted text (from pdf.js or mammoth)
    documentType: 'pdf' | 'image' | 'docx' | 'pptx',
    filename: string,
    pageCount: number
  ): Promise<DocumentAnalysis>;

  // Analyze a pasted slide image and transform into Cue format (Phase 56)
  analyzePastedSlide(
    imageBase64: string,        // Raw base64, NO data URL prefix
    verbosity?: VerbosityLevel  // Controls speaker notes depth
  ): Promise<Slide>;

  // Analyze an image and generate caption with teaching talking points (Phase 57)
  analyzeImage(
    imageBase64: string         // Raw base64, NO data URL prefix
  ): Promise<ImageCaptionResult>;

  // Condense deck using lesson plan as essential-content guide (Phase 60, replaces Phase 58 cohesion)
  condenseDeck(
    slides: Slide[],
    lessonPlanText: string,
    lessonPlanImages: string[],
    gradeLevel: string
  ): Promise<CondensationResult>;

  // Analyze gaps between deck and lesson plan (Phase 59)
  analyzeGaps(
    slides: Slide[],
    lessonPlanText: string,
    lessonPlanImages: string[],
    gradeLevel: string
  ): Promise<GapAnalysisResult>;

  // Generate a full slide from an identified gap (Phase 59)
  generateSlideFromGap(
    gap: IdentifiedGap,
    slides: Slide[],
    lessonTopic: string,
    verbosity: VerbosityLevel
  ): Promise<Slide>;

  // Transform teleprompter scripts into colleague-deliverable talking-point bullets (Phase 61)
  transformForColleague(
    slides: Slide[],
    deckVerbosity: VerbosityLevel,
    gradeLevel: string,
    onProgress?: (progress: { current: number; total: number }) => void
  ): Promise<ColleagueTransformationResult>;

  // Document enhancement for resource differentiation (Phase 45)
  enhanceDocument(
    documentAnalysis: DocumentAnalysis,
    slideContext: string,       // Formatted slide content for alignment
    options: EnhancementOptions,
    signal?: AbortSignal        // For cancellation support (ENHANCE-05)
  ): Promise<EnhancementResult>;
}

// Factory function to create the appropriate provider instance
// Note: OpenAI removed - doesn't support browser CORS
export function createAIProvider(config: {
  provider: AIProvider;
  apiKey: string;
  selectedModel?: string;
}): AIProviderInterface {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.selectedModel);
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.selectedModel);
    default:
      throw new AIProviderError(
        USER_ERROR_MESSAGES.UNKNOWN_ERROR,
        'UNKNOWN_ERROR'
      );
  }
}
