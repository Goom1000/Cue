import { AIProviderInterface, AIProviderError } from '../aiProvider';
import { Slide, LessonResource } from '../../types';
import { QuizQuestion } from '../geminiService';

/**
 * ClaudeProvider is a placeholder implementation.
 * Full implementation will be added in Plan 02-02.
 */
export class ClaudeProvider implements AIProviderInterface {
  constructor(private apiKey: string) {
    // Store API key for Plan 2 implementation
  }

  async generateLessonSlides(rawText: string, pageImages?: string[]): Promise<Slide[]> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateSlideImage(imagePrompt: string, layout?: string): Promise<string | undefined> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateResourceImage(imagePrompt: string): Promise<string | undefined> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateQuickQuestion(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'Grade C' | 'Grade B' | 'Grade A'
  ): Promise<string> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async reviseSlide(slide: Slide, instruction: string): Promise<Partial<Slide>> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateContextualSlide(
    lessonTopic: string,
    userInstruction: string,
    prevSlide?: Slide,
    nextSlide?: Slide
  ): Promise<Slide> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateLessonResources(lessonText: string, slideContext: string): Promise<LessonResource[]> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }

  async generateImpromptuQuiz(
    slides: Slide[],
    currentIndex: number,
    numQuestions?: number
  ): Promise<QuizQuestion[]> {
    throw new AIProviderError(
      'Claude provider not yet implemented',
      'UNKNOWN_ERROR'
    );
  }
}
