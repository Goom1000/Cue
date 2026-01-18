import { AIProviderInterface, AIProviderError, USER_ERROR_MESSAGES } from '../aiProvider';
import { Slide, LessonResource } from '../../types';
import {
  QuizQuestion,
  generateLessonSlides as geminiGenerateLessonSlides,
  generateSlideImage as geminiGenerateSlideImage,
  generateResourceImage as geminiGenerateResourceImage,
  generateQuickQuestion as geminiGenerateQuickQuestion,
  reviseSlide as geminiReviseSlide,
  generateContextualSlide as geminiGenerateContextualSlide,
  generateExemplarSlide as geminiGenerateExemplarSlide,
  generateLessonResources as geminiGenerateLessonResources,
  generateImpromptuQuiz as geminiGenerateImpromptuQuiz,
} from '../geminiService';

/**
 * GeminiProvider wraps the existing geminiService functions.
 *
 * The apiKey passed to the constructor is forwarded to all geminiService functions.
 */
export class GeminiProvider implements AIProviderInterface {
  constructor(private apiKey: string) {}


  async generateLessonSlides(rawText: string, pageImages?: string[]): Promise<Slide[]> {
    try {
      return await geminiGenerateLessonSlides(this.apiKey, rawText, pageImages || []);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateSlideImage(imagePrompt: string, layout?: string): Promise<string | undefined> {
    try {
      return await geminiGenerateSlideImage(this.apiKey, imagePrompt, layout);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateResourceImage(imagePrompt: string): Promise<string | undefined> {
    try {
      return await geminiGenerateResourceImage(this.apiKey, imagePrompt);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateQuickQuestion(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'Grade C' | 'Grade B' | 'Grade A'
  ): Promise<string> {
    try {
      return await geminiGenerateQuickQuestion(this.apiKey, slideTitle, slideContent, difficulty);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async reviseSlide(slide: Slide, instruction: string): Promise<Partial<Slide>> {
    try {
      return await geminiReviseSlide(this.apiKey, slide, instruction);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateContextualSlide(
    lessonTopic: string,
    userInstruction: string,
    prevSlide?: Slide,
    nextSlide?: Slide
  ): Promise<Slide> {
    try {
      return await geminiGenerateContextualSlide(this.apiKey, lessonTopic, userInstruction, prevSlide, nextSlide);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide> {
    try {
      return await geminiGenerateExemplarSlide(this.apiKey, lessonTopic, prevSlide);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateLessonResources(lessonText: string, slideContext: string): Promise<LessonResource[]> {
    try {
      return await geminiGenerateLessonResources(this.apiKey, lessonText, slideContext);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateImpromptuQuiz(
    slides: Slide[],
    currentIndex: number,
    numQuestions?: number
  ): Promise<QuizQuestion[]> {
    try {
      return await geminiGenerateImpromptuQuiz(this.apiKey, slides, currentIndex, numQuestions);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Wrap any error in AIProviderError for consistent error handling.
   * If already an AIProviderError, rethrow as-is.
   */
  private wrapError(error: unknown): AIProviderError {
    if (error instanceof AIProviderError) {
      return error;
    }
    return new AIProviderError(
      USER_ERROR_MESSAGES.UNKNOWN_ERROR,
      'UNKNOWN_ERROR',
      error
    );
  }
}
