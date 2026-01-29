import { GoogleGenAI, Type } from "@google/genai";
import { AIProviderInterface, AIProviderError, USER_ERROR_MESSAGES, GenerationInput, GameQuestionRequest, VerbosityLevel, ChatContext } from '../aiProvider';
import { Slide, LessonResource, DocumentAnalysis } from '../../types';
import { DOCUMENT_ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../documentAnalysis/analysisPrompts';
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

  async analyzeDocument(
    documentImages: string[],
    documentText: string,
    documentType: 'pdf' | 'image' | 'docx',
    filename: string,
    pageCount: number
  ): Promise<DocumentAnalysis> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      // Build content parts
      const parts: any[] = [
        { text: buildAnalysisUserPrompt(filename, documentType, documentText, pageCount) }
      ];

      // Add images (limit to 10 to avoid token overflow)
      const limitedImages = documentImages.slice(0, 10);
      for (const img of limitedImages) {
        parts.push({
          inlineData: { mimeType: 'image/jpeg', data: img }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts },
        config: {
          systemInstruction: DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentType: {
                type: Type.STRING,
                enum: ['worksheet', 'handout', 'quiz', 'activity', 'assessment', 'other']
              },
              documentTypeConfidence: {
                type: Type.STRING,
                enum: ['high', 'medium', 'low']
              },
              alternativeTypes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              title: { type: Type.STRING },
              pageCount: { type: Type.INTEGER },
              hasAnswerKey: { type: Type.BOOLEAN },
              elements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ['header', 'subheader', 'paragraph', 'question', 'answer',
                             'instruction', 'table', 'diagram', 'image', 'list', 'blank-space']
                    },
                    content: { type: Type.STRING },
                    position: { type: Type.INTEGER },
                    visualContent: { type: Type.BOOLEAN },
                    children: { type: Type.ARRAY, items: { type: Type.STRING } },
                    tableData: {
                      type: Type.OBJECT,
                      properties: {
                        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                      }
                    }
                  },
                  required: ['type', 'content', 'position']
                }
              },
              visualContentCount: { type: Type.INTEGER }
            },
            required: ['documentType', 'documentTypeConfidence', 'title', 'pageCount', 'hasAnswerKey', 'elements', 'visualContentCount']
          },
          temperature: 0 // Consistent classification
        }
      });

      const text = response.text || '{}';
      return JSON.parse(text) as DocumentAnalysis;
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
