import { Slide, LessonResource, AIProvider } from '../types';
import { QuizQuestion } from './geminiService';
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
