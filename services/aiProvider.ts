import { Slide, LessonResource, AIProvider, GameType, GameDifficulty } from '../types';
import { QuizQuestion, QuestionWithAnswer } from './geminiService';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';

// Generation mode types for multi-source slide generation
export type GenerationMode = 'fresh' | 'refine' | 'blend';

export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
}

// Context from slides for question generation
export interface SlideContext {
  lessonTopic: string;           // From first slide title
  cumulativeContent: string;     // All slides up to current, formatted
  currentSlideTitle: string;     // Current slide title
  currentSlideContent: string[]; // Current slide bullets
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
    pageImages?: string[]
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
}

// Factory function to create the appropriate provider instance
// Note: OpenAI removed - doesn't support browser CORS
export function createAIProvider(config: {
  provider: AIProvider;
  apiKey: string;
}): AIProviderInterface {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider(config.apiKey);
    case 'claude':
      return new ClaudeProvider(config.apiKey);
    default:
      throw new AIProviderError(
        USER_ERROR_MESSAGES.UNKNOWN_ERROR,
        'UNKNOWN_ERROR'
      );
  }
}
