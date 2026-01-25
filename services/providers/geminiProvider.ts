import { AIProviderInterface, AIProviderError, USER_ERROR_MESSAGES, GenerationInput, GameQuestionRequest, VerbosityLevel, ChatContext } from '../aiProvider';
import { Slide, LessonResource } from '../../types';
import {
  QuizQuestion,
  QuestionWithAnswer,
  generateLessonSlides as geminiGenerateLessonSlides,
  generateSlideImage as geminiGenerateSlideImage,
  generateResourceImage as geminiGenerateResourceImage,
  generateQuickQuestion as geminiGenerateQuickQuestion,
  reviseSlide as geminiReviseSlide,
  generateContextualSlide as geminiGenerateContextualSlide,
  generateExemplarSlide as geminiGenerateExemplarSlide,
  generateElaborateSlide as geminiGenerateElaborateSlide,
  generateWorkTogetherSlide as geminiGenerateWorkTogetherSlide,
  generateClassChallengeSlide as geminiGenerateClassChallengeSlide,
  generateLessonResources as geminiGenerateLessonResources,
  generateImpromptuQuiz as geminiGenerateImpromptuQuiz,
  generateQuestionWithAnswer as geminiGenerateQuestionWithAnswer,
  generateGameQuestions as geminiGenerateGameQuestions,
  regenerateTeleprompter as geminiRegenerateTeleprompter,
  streamChatResponse as geminiStreamChatResponse,
} from '../geminiService';

/**
 * GeminiProvider wraps the existing geminiService functions.
 *
 * The apiKey passed to the constructor is forwarded to all geminiService functions.
 */
export class GeminiProvider implements AIProviderInterface {
  constructor(private apiKey: string) {}


  async generateLessonSlides(
    inputOrText: GenerationInput | string,
    pageImages?: string[]
  ): Promise<Slide[]> {
    try {
      return await geminiGenerateLessonSlides(this.apiKey, inputOrText, pageImages || []);
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

  async generateElaborateSlide(lessonTopic: string, sourceSlide: Slide, allSlides: Slide[]): Promise<Slide> {
    try {
      return await geminiGenerateElaborateSlide(this.apiKey, lessonTopic, sourceSlide, allSlides);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateWorkTogetherSlide(lessonTopic: string, sourceSlide: Slide, allSlides: Slide[]): Promise<Slide> {
    try {
      return await geminiGenerateWorkTogetherSlide(this.apiKey, lessonTopic, sourceSlide, allSlides);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateClassChallengeSlide(lessonTopic: string, sourceSlide: Slide, allSlides: Slide[]): Promise<Slide> {
    try {
      return await geminiGenerateClassChallengeSlide(this.apiKey, lessonTopic, sourceSlide, allSlides);
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

  async generateQuestionWithAnswer(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'A' | 'B' | 'C' | 'D' | 'E'
  ): Promise<QuestionWithAnswer> {
    try {
      return await geminiGenerateQuestionWithAnswer(this.apiKey, slideTitle, slideContent, difficulty);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async generateGameQuestions(request: GameQuestionRequest): Promise<QuizQuestion[]> {
    try {
      return await geminiGenerateGameQuestions(this.apiKey, request);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async regenerateTeleprompter(slide: Slide, verbosity: VerbosityLevel, prevSlide?: Slide, nextSlide?: Slide): Promise<string> {
    try {
      return await geminiRegenerateTeleprompter(this.apiKey, slide, verbosity, prevSlide, nextSlide);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async *streamChat(
    message: string,
    context: ChatContext
  ): AsyncGenerator<string, void, unknown> {
    try {
      yield* geminiStreamChatResponse(this.apiKey, message, context);
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
