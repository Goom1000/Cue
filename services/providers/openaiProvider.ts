import { AIProviderInterface, AIProviderError, USER_ERROR_MESSAGES } from '../aiProvider';
import { Slide, LessonResource } from '../../types';
import { QuizQuestion } from '../geminiService';

/**
 * OpenAIProvider throws immediately in the constructor.
 * OpenAI does NOT support CORS for direct browser requests.
 * All browser requests to api.openai.com will fail with CORS errors.
 *
 * Users must select Gemini or Claude instead.
 */
export class OpenAIProvider implements AIProviderInterface {
  constructor(apiKey: string) {
    // Throw immediately - OpenAI doesn't work in browser due to CORS
    throw new AIProviderError(
      USER_ERROR_MESSAGES.PROVIDER_NOT_SUPPORTED,
      'PROVIDER_NOT_SUPPORTED'
    );
  }

  // These methods will never be called (constructor throws)
  // but TypeScript requires them for interface compliance

  async generateLessonSlides(rawText: string, pageImages?: string[]): Promise<Slide[]> {
    throw new Error('unreachable');
  }

  async generateSlideImage(imagePrompt: string, layout?: string): Promise<string | undefined> {
    throw new Error('unreachable');
  }

  async generateResourceImage(imagePrompt: string): Promise<string | undefined> {
    throw new Error('unreachable');
  }

  async generateQuickQuestion(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'Grade C' | 'Grade B' | 'Grade A'
  ): Promise<string> {
    throw new Error('unreachable');
  }

  async reviseSlide(slide: Slide, instruction: string): Promise<Partial<Slide>> {
    throw new Error('unreachable');
  }

  async generateContextualSlide(
    lessonTopic: string,
    userInstruction: string,
    prevSlide?: Slide,
    nextSlide?: Slide
  ): Promise<Slide> {
    throw new Error('unreachable');
  }

  async generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide> {
    throw new Error('unreachable');
  }

  async generateLessonResources(lessonText: string, slideContext: string): Promise<LessonResource[]> {
    throw new Error('unreachable');
  }

  async generateImpromptuQuiz(
    slides: Slide[],
    currentIndex: number,
    numQuestions?: number
  ): Promise<QuizQuestion[]> {
    throw new Error('unreachable');
  }
}
