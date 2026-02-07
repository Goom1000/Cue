import { GoogleGenAI, Type } from "@google/genai";
import { AIProviderInterface, AIProviderError, USER_ERROR_MESSAGES, GenerationInput, GameQuestionRequest, VerbosityLevel, ChatContext, CondensationResult, GapAnalysisResult, IdentifiedGap } from '../aiProvider';
import { Slide, LessonResource, DocumentAnalysis, EnhancementResult, EnhancementOptions } from '../../types';
import { DOCUMENT_ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../documentAnalysis/analysisPrompts';
import { ENHANCEMENT_SYSTEM_PROMPT, buildEnhancementUserPrompt } from '../documentEnhancement/enhancementPrompts';
import { SLIDE_ANALYSIS_SYSTEM_PROMPT, buildSlideAnalysisPrompt, SLIDE_RESPONSE_SCHEMA, IMAGE_CAPTION_PROMPT, IMAGE_CAPTION_SCHEMA, ImageCaptionResult } from '../slideAnalysis/slideAnalysisPrompts';
import { buildDeckContextForCohesion } from '../prompts/cohesionPrompts';
import {
  CONDENSATION_SYSTEM_PROMPT,
  buildCondensationUserPrompt,
  buildCondensationContext,
  CONDENSATION_RESPONSE_SCHEMA
} from '../prompts/condensationPrompts';
import {
  GAP_ANALYSIS_SYSTEM_PROMPT,
  buildGapAnalysisUserPrompt,
  buildGapAnalysisContext,
  GAP_ANALYSIS_RESPONSE_SCHEMA,
  buildGapSlideGenerationPrompt,
  GAP_SLIDE_RESPONSE_SCHEMA
} from '../prompts/gapAnalysisPrompts';
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
 * Shared schema for worksheet version elements.
 */
const VERSION_ELEMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['header', 'subheader', 'paragraph', 'question', 'answer', 'instruction', 'table', 'diagram', 'image', 'list', 'blank-space'] },
    originalContent: { type: Type.STRING },
    enhancedContent: { type: Type.STRING },
    position: { type: Type.INTEGER },
    visualContent: { type: Type.BOOLEAN },
    slideReference: { type: Type.STRING },
    children: { type: Type.ARRAY, items: { type: Type.STRING } },
    tableData: {
      type: Type.OBJECT,
      properties: {
        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
        rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
      }
    }
  },
  required: ['type', 'originalContent', 'enhancedContent', 'position']
};

/**
 * Schema for generating a single version with slide matches.
 * Used for split API calls to avoid token limits.
 */
const createSingleVersionSchema = (level: 'simple' | 'standard' | 'detailed') => ({
  type: Type.OBJECT,
  properties: {
    slideMatches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slideIndex: { type: Type.INTEGER },
          slideTitle: { type: Type.STRING },
          relevanceScore: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          reason: { type: Type.STRING }
        },
        required: ['slideIndex', 'slideTitle', 'relevanceScore', 'reason']
      }
    },
    version: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING, enum: [level] },
        title: { type: Type.STRING },
        alignedSlides: { type: Type.ARRAY, items: { type: Type.INTEGER } },
        slideAlignmentNote: { type: Type.STRING },
        elements: { type: Type.ARRAY, items: VERSION_ELEMENT_SCHEMA }
      },
      required: ['level', 'title', 'alignedSlides', 'slideAlignmentNote', 'elements']
    }
  },
  required: ['slideMatches', 'version']
});

/**
 * Schema for generating answer keys for all versions.
 */
const ANSWER_KEYS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answerKeys: {
      type: Type.OBJECT,
      properties: {
        structure: { type: Type.STRING, enum: ['unified', 'per-level'] },
        keys: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.STRING, enum: ['simple', 'standard', 'detailed'] },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionRef: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['closed', 'open-ended'] },
                    answer: { type: Type.STRING },
                    rubric: {
                      type: Type.OBJECT,
                      properties: {
                        criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                        exemplar: { type: Type.STRING },
                        commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  },
                  required: ['questionRef', 'type']
                }
              }
            },
            required: ['items']
          }
        }
      },
      required: ['structure', 'keys']
    }
  },
  required: ['answerKeys']
};

// Default model to use if none is selected
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * GeminiProvider wraps the existing geminiService functions.
 *
 * The apiKey passed to the constructor is forwarded to all geminiService functions.
 */
export class GeminiProvider implements AIProviderInterface {
  private model: string;

  constructor(private apiKey: string, selectedModel?: string) {
    this.model = selectedModel || DEFAULT_GEMINI_MODEL;
    console.log(`[GeminiProvider] Using model: ${this.model}`);
  }


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
        model: this.model,
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

  async analyzePastedSlide(
    imageBase64: string,
    verbosity: VerbosityLevel = 'standard'
  ): Promise<Slide> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      const parts: any[] = [
        { text: buildSlideAnalysisPrompt(verbosity) },
        { inlineData: { mimeType: 'image/png', data: imageBase64 } }
      ];

      const response = await ai.models.generateContent({
        model: this.model,
        contents: { parts },
        config: {
          systemInstruction: SLIDE_ANALYSIS_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: SLIDE_RESPONSE_SCHEMA,
          temperature: 0.7
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      return {
        id: '',
        title: parsed.title || 'Untitled Slide',
        content: parsed.content || [],
        speakerNotes: parsed.speakerNotes || '',
        imagePrompt: parsed.imagePrompt || '',
        layout: parsed.layout || 'split',
        theme: parsed.theme || 'default',
        isGeneratingImage: false
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async analyzeImage(imageBase64: string): Promise<ImageCaptionResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      const parts: any[] = [
        { text: 'Analyze this image and generate a title, caption, and teaching talking points.' },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      ];

      const response = await ai.models.generateContent({
        model: this.model,
        contents: { parts },
        config: {
          systemInstruction: IMAGE_CAPTION_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: IMAGE_CAPTION_SCHEMA,
          temperature: 0.7
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      return {
        title: parsed.title || 'Untitled Image',
        caption: parsed.caption || '',
        talkingPoints: Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : [],
      };
    } catch (error) {
      console.error('[GeminiProvider] analyzeImage error:', error);
      throw this.wrapError(error);
    }
  }

  async condenseDeck(
    slides: Slide[],
    lessonPlanText: string,
    lessonPlanImages: string[],
    gradeLevel: string
  ): Promise<CondensationResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const context = buildCondensationContext(slides, lessonPlanText);
      const userPrompt = buildCondensationUserPrompt(gradeLevel);
      const fullPrompt = `${userPrompt}\n\n${context}`;

      // Build contents: multimodal if page images available
      let contents: any;
      if (lessonPlanImages.length > 0) {
        const parts: any[] = [{ text: fullPrompt }];
        const limitedImages = lessonPlanImages.slice(0, 5);
        for (const img of limitedImages) {
          parts.push({
            inlineData: { mimeType: 'image/jpeg', data: img }
          });
        }
        contents = parts;
      } else {
        contents = fullPrompt;
      }

      const response = await ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: CONDENSATION_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: CONDENSATION_RESPONSE_SCHEMA,
          temperature: 0.5,
          maxOutputTokens: 8192
        }
      });

      const rawText = response.text || '{}';
      // Sanitize control characters only inside JSON string values (Gemini sometimes emits raw newlines/tabs)
      let sanitized = '';
      let inStr = false;
      let esc = false;
      for (let i = 0; i < rawText.length; i++) {
        const ch = rawText[i];
        if (esc) { sanitized += ch; esc = false; continue; }
        if (ch === '\\' && inStr) { sanitized += ch; esc = true; continue; }
        if (ch === '"') { inStr = !inStr; sanitized += ch; continue; }
        if (inStr && ch.charCodeAt(0) < 32) {
          if (ch === '\n') sanitized += '\\n';
          else if (ch === '\r') sanitized += '\\r';
          else if (ch === '\t') sanitized += '\\t';
          continue;
        }
        sanitized += ch;
      }
      const parsed = JSON.parse(sanitized);

      // Build change map from AI response (only contains edit/remove/merge)
      const changeMap = new Map<number, any>();
      for (const action of (parsed.actions || [])) {
        if (slides[action.slideIndex]) {
          changeMap.set(action.slideIndex, action);
        }
      }

      // Build full actions array: implicit "keep" for slides not mentioned
      const actions = slides.map((_, i) => {
        const action = changeMap.get(i);
        if (!action) {
          return { slideIndex: i, action: 'keep' as const, reason: '' };
        }
        return {
          slideIndex: action.slideIndex,
          action: action.action || 'keep',
          reason: action.reason || '',
          mergeWithSlideIndices: action.mergeWithSlideIndices || undefined,
        };
      });

      return {
        actions,
        summary: parsed.summary || 'Condensation analysis complete',
        originalSlideCount: slides.length,
        proposedSlideCount: parsed.proposedSlideCount ?? slides.length,
        essentialTopicsPreserved: parsed.essentialTopicsPreserved || []
      };
    } catch (error) {
      console.error('[GeminiProvider] condenseDeck error:', error);
      throw this.wrapError(error);
    }
  }

  async analyzeGaps(
    slides: Slide[],
    lessonPlanText: string,
    lessonPlanImages: string[],
    gradeLevel: string
  ): Promise<GapAnalysisResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const context = buildGapAnalysisContext(slides, lessonPlanText);
      const userPrompt = buildGapAnalysisUserPrompt(gradeLevel);
      const fullPrompt = `${userPrompt}\n\n${context}`;

      // Build contents: multimodal if page images available, plain text otherwise
      let contents: any;
      if (lessonPlanImages.length > 0) {
        const parts: any[] = [{ text: fullPrompt }];
        // Limit to 5 page images to control token usage
        const limitedImages = lessonPlanImages.slice(0, 5);
        for (const img of limitedImages) {
          parts.push({
            inlineData: { mimeType: 'image/jpeg', data: img }
          });
        }
        contents = parts;
      } else {
        contents = fullPrompt;
      }

      const response = await ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: GAP_ANALYSIS_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: GAP_ANALYSIS_RESPONSE_SCHEMA,
          temperature: 0.5
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      return {
        gaps: parsed.gaps || [],
        summary: parsed.summary || 'Gap analysis complete',
        coveragePercentage: parsed.coveragePercentage ?? 0
      };
    } catch (error) {
      console.error('[GeminiProvider] analyzeGaps error:', error);
      throw this.wrapError(error);
    }
  }

  async generateSlideFromGap(
    gap: IdentifiedGap,
    slides: Slide[],
    lessonTopic: string,
    verbosity: VerbosityLevel
  ): Promise<Slide> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const prompt = buildGapSlideGenerationPrompt(gap, 'Year 6 (10-11 years old)', verbosity)
        + `\n\nEXISTING DECK CONTEXT (for tone matching):\n${buildDeckContextForCohesion(slides)}\n\nLESSON TOPIC: ${lessonTopic}`;

      const response = await ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: GAP_SLIDE_RESPONSE_SCHEMA,
          temperature: 0.7
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      return {
        id: `gap-gen-${Date.now()}`,
        title: parsed.title || gap.suggestedTitle,
        content: parsed.content || gap.suggestedContent,
        speakerNotes: parsed.speakerNotes || '',
        imagePrompt: parsed.imagePrompt || `Educational illustration: ${gap.topic}`,
        layout: parsed.layout || 'split',
        source: { type: 'ai-generated' as const }
      };
    } catch (error) {
      console.error('[GeminiProvider] generateSlideFromGap error:', error);
      throw this.wrapError(error);
    }
  }

  /**
   * Generate a single worksheet version using a separate API call.
   * This avoids token limits by splitting the work.
   */
  private async generateSingleVersion(
    ai: GoogleGenAI,
    level: 'simple' | 'standard' | 'detailed',
    documentAnalysis: DocumentAnalysis,
    slideContext: string,
    options: EnhancementOptions,
    signal?: AbortSignal
  ): Promise<{ slideMatches: any[]; version: any }> {
    const levelDescriptions = {
      simple: 'SIMPLE LEVEL: Shorter sentences (max 15 words), simpler vocabulary (Year 4, ages 8-9), visual scaffolding, familiar concrete language.',
      standard: 'STANDARD LEVEL: Clean formatting, echo slide terminology, add "See Slide X" references, Year 6 reading level (ages 10-11), light enhancement only.',
      detailed: 'DETAILED LEVEL: Add extension questions, hints, worked examples, reasoning prompts, Year 7-8 vocabulary (ages 11-13), deeper explanations.'
    };

    const formattedElements = documentAnalysis.elements.map((element, index) => {
      const visualMarker = element.visualContent ? ' [Visual element - preserve placeholder]' : '';
      const childrenText = element.children?.length ? `\n  Children: ${element.children.join('; ')}` : '';
      const tableText = element.tableData
        ? `\n  Table: ${element.tableData.headers.join(' | ')}\n  ${element.tableData.rows.map(r => r.join(' | ')).join('\n  ')}`
        : '';
      return `${index + 1}. [${element.type.toUpperCase()}]${visualMarker}: ${element.content}${childrenText}${tableText}`;
    }).join('\n\n');

    const prompt = `DOCUMENT TO ENHANCE:

Title: ${documentAnalysis.title}
Type: ${documentAnalysis.documentType}
Grade Level: ${options.gradeLevel}
Pages: ${documentAnalysis.pageCount}

DOCUMENT ELEMENTS:
${formattedElements}

---

LESSON SLIDES FOR ALIGNMENT:
${slideContext}

---

TASK: Generate ONLY the ${level.toUpperCase()} version of this worksheet.

${levelDescriptions[level]}

PRESERVATION RULES:
1. Keep ALL original questions and exercises
2. Keep ALL factual information unchanged
3. Mark visual content as "[Original diagram: description]"
4. NEVER invent content not in the original

Return JSON with slideMatches (which slides relate to this document) and version (the ${level} version).`;

    const response = await ai.models.generateContent({
      model: this.model,
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: ENHANCEMENT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: createSingleVersionSchema(level),
        temperature: 0.3,
        abortSignal: signal
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  }

  /**
   * Generate answer keys for all versions.
   */
  private async generateAnswerKeys(
    ai: GoogleGenAI,
    versions: { simple: any; standard: any; detailed: any },
    signal?: AbortSignal
  ): Promise<{ answerKeys: any }> {
    // Summarize questions from each version for answer key generation
    const summarizeQuestions = (version: any, level: string) => {
      const questions = version.elements
        .filter((e: any) => e.type === 'question')
        .map((e: any, i: number) => `${level} Q${i + 1}: ${e.enhancedContent}`)
        .join('\n');
      return questions || `${level}: No explicit questions`;
    };

    const prompt = `GENERATE ANSWER KEYS for these worksheet versions:

SIMPLE VERSION QUESTIONS:
${summarizeQuestions(versions.simple, 'Simple')}

STANDARD VERSION QUESTIONS:
${summarizeQuestions(versions.standard, 'Standard')}

DETAILED VERSION QUESTIONS:
${summarizeQuestions(versions.detailed, 'Detailed')}

RULES:
- For closed questions: provide specific answers
- For open-ended questions: provide rubric with criteria, exemplar, and common mistakes
- Use "unified" structure if questions are similar across levels
- Use "per-level" structure if questions differ significantly`;

    const response = await ai.models.generateContent({
      model: this.model,
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: 'Generate comprehensive answer keys for educational worksheets.',
        responseMimeType: 'application/json',
        responseSchema: ANSWER_KEYS_SCHEMA,
        temperature: 0.2,
        abortSignal: signal
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  }

  /**
   * Enhance a document with differentiated versions and answer keys.
   * Uses split API calls (one per version) to avoid token limits.
   */
  async enhanceDocument(
    documentAnalysis: DocumentAnalysis,
    slideContext: string,
    options: EnhancementOptions,
    signal?: AbortSignal
  ): Promise<EnhancementResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      console.log('[GeminiProvider] Starting split enhancement (3 parallel calls)...');

      // Generate all 3 versions in parallel
      const [simpleResult, standardResult, detailedResult] = await Promise.all([
        this.generateSingleVersion(ai, 'simple', documentAnalysis, slideContext, options, signal),
        this.generateSingleVersion(ai, 'standard', documentAnalysis, slideContext, options, signal),
        this.generateSingleVersion(ai, 'detailed', documentAnalysis, slideContext, options, signal)
      ]);

      console.log('[GeminiProvider] All versions generated, combining results...');

      // Use slideMatches from any result (they should be the same)
      const slideMatches = simpleResult.slideMatches || standardResult.slideMatches || detailedResult.slideMatches || [];

      // Combine versions
      const versions = {
        simple: simpleResult.version,
        standard: standardResult.version,
        detailed: detailedResult.version
      };

      // Generate answer keys if requested
      let answerKeys = { structure: 'unified' as const, keys: [] as any[] };
      if (options.generateAnswerKey) {
        console.log('[GeminiProvider] Generating answer keys...');
        const answerKeyResult = await this.generateAnswerKeys(ai, versions, signal);
        answerKeys = answerKeyResult.answerKeys;
      }

      const result: EnhancementResult = {
        slideMatches,
        versions,
        answerKeys
      };

      // Validate required fields exist
      if (!result.versions?.simple || !result.versions?.standard || !result.versions?.detailed) {
        console.error('[GeminiProvider] Enhancement response missing version(s)');
        throw new AIProviderError(
          'Enhancement response was incomplete. Please try again.',
          'PARSE_ERROR',
          'Missing required version in response'
        );
      }

      console.log('[GeminiProvider] Enhancement complete');
      return result;
    } catch (error) {
      // Let AbortError propagate for cancellation handling
      if ((error as Error).name === 'AbortError') {
        throw error;
      }

      // If already an AIProviderError, re-throw as-is
      if (error instanceof AIProviderError) {
        throw error;
      }

      // Log the actual error for debugging
      console.error('[GeminiProvider] Enhancement error:', error);

      // Try to extract more specific error information
      const err = error as any;
      if (err.message?.includes('429') || err.status === 429) {
        throw new AIProviderError(USER_ERROR_MESSAGES.RATE_LIMIT, 'RATE_LIMIT', error);
      }
      if (err.message?.includes('401') || err.message?.includes('403') || err.status === 401 || err.status === 403) {
        throw new AIProviderError(USER_ERROR_MESSAGES.AUTH_ERROR, 'AUTH_ERROR', error);
      }
      if (err.message?.includes('500') || err.message?.includes('503') || err.status >= 500) {
        throw new AIProviderError(USER_ERROR_MESSAGES.SERVER_ERROR, 'SERVER_ERROR', error);
      }

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
