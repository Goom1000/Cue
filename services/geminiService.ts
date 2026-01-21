
import { GoogleGenAI, Type } from "@google/genai";
import { Slide, LessonResource } from "../types";
import { GenerationInput, GenerationMode, AIProviderError, USER_ERROR_MESSAGES } from './aiProvider';

// Shared teleprompter rules used across all generation modes
const TELEPROMPTER_RULES = `
STRICT SPEAKER NOTE RULES (TELEPROMPTER LOGIC):
The app uses a "Progressive Disclosure" system.
1. The visual bullet point appears.
2. The Student reads the bullet.
3. The Teacher (Teleprompter) adds insight.

Therefore:
- **NEVER** repeat the text that is on the slide in the speaker notes.
- **NEVER** re-summarize a point that was just made in the previous bullet.
- Each note must **ADD VALUE**: provide a concrete example, an analogy, or a "Why this matters" explanation.
- Ensure a continuous narrative flow. Note 2 must naturally follow Note 1.

FORMATTING:
The speaker notes must use "👉" as a delimiter.
- Segment 0 (Intro): Set the scene before bullet 1 appears.
- Segment 1 (for Bullet 1): Elaborate on Bullet 1.
- Segment 2 (for Bullet 2): Elaborate on Bullet 2 (Do not repeat Segment 1).
- The number of "👉" segments MUST be exactly (Number of Bullets + 1).
`;

/**
 * Get the appropriate system instruction based on generation mode.
 */
function getSystemInstructionForMode(mode: GenerationMode): string {
  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform a formal lesson plan into a teaching slideshow.

CRITICAL: You will be provided with both text AND visual images of the document.
- Use the images to accurately interpret TABLES, CHARTS, and DIAGRAMS that may not have parsed well as text.
- Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'.
- **MANDATORY**: You MUST include distinct slides for **'Success Criteria'** and **'Differentiation'** (Support, Extension, Intervention) found in the document.
  - Success Criteria should be a clear checklist.
  - Differentiation should explain how to adapt for different levels (e.g., C Grade, B Grade, A Grade).

${TELEPROMPTER_RULES}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks, and 'grid' for Success Criteria/Differentiation.
`;

    case 'refine':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform an existing presentation into clean, less text-dense PiPi-style slides.

CRITICAL RULE - CONTENT PRESERVATION:
**You MUST preserve ALL content from the original presentation.**
- Do NOT omit any slides, sections, activities, examples, or instructions.
- If the original has a "Daily Challenge" - include it.
- If the original has a "Worked Example" - include it.
- If something seems clunky or doesn't fit the PiPi style, RESTRUCTURE it to fit - do NOT remove it.
- The teacher will decide what to remove later. Your job is to improve presentation, not edit content.

REFINE MODE RULES:
- Extract key concepts from the presentation provided.
- Create NEW PiPi-style slides from scratch (do not preserve original formatting).
- You may split dense slides into multiple slides - but all original content must appear somewhere.
- You may reorder slides for better pedagogical flow.
- Note any images/diagrams that existed with "[Visual: description]" in the relevant bullet point so the teacher knows to re-add them.
- Output stands alone - no references to "original slide 3" or similar markers.
- Generate teleprompter scripts by inferring the teaching goals from the presentation content.

${TELEPROMPTER_RULES}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks.
`;

    case 'blend':
      return `
You are an elite Primary Education Consultant.
Your goal is to create slides that combine lesson content with an existing presentation.

BLEND MODE RULES:
- Analyze BOTH the lesson plan AND existing presentation provided.
- Determine content overlap between sources.
- If the lesson contains topics NOT in the presentation, add new slides for those topics.
- Standardize ALL output to PiPi style (do not try to match original presentation aesthetic).
- When lesson says X but presentation says Y, note the discrepancy in speakerNotes: "[Note: Sources differ on...]"
- Output stands alone - no references to source documents.
- Synthesize both sources into a cohesive teaching narrative for the teleprompter scripts.

${TELEPROMPTER_RULES}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks.
`;
  }
}

export const generateLessonSlides = async (
  apiKey: string,
  inputOrText: GenerationInput | string,
  pageImages: string[] = []
): Promise<Slide[]> => {
  // Normalize to GenerationInput for backward compatibility
  const input: GenerationInput = typeof inputOrText === 'string'
    ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
    : inputOrText;

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const systemInstruction = getSystemInstructionForMode(input.mode);

  // Build contents array based on mode
  const contents: any[] = [];

  // Add text prompt based on mode
  if (input.mode === 'fresh') {
    contents.push({ text: `Transform this formal lesson plan into a sequence of teaching slides:\n\n${input.lessonText}` });
  } else if (input.mode === 'refine') {
    contents.push({ text: `Transform this existing presentation into clean, less text-dense PiPi-style slides:\n\n${input.presentationText || ''}` });
  } else { // blend
    contents.push({ text: `Combine this lesson plan:\n\n${input.lessonText}\n\n---\n\nWith this existing presentation:\n\n${input.presentationText || ''}\n\nCreate enhanced PiPi-style slides that incorporate content from both sources.` });
  }

  // Helper to add images to content parts
  const addImages = (images: string[] | undefined, limit: number = 10) => {
    if (images && images.length > 0) {
      // Limit images to avoid token limits (especially for blend mode)
      const limitedImages = images.slice(0, limit);
      limitedImages.forEach(base64 => {
        // Remove data URI prefix if present
        const data = base64.includes(',') ? base64.split(',')[1] : base64;
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data
          }
        });
      });
    }
  };

  // Add images based on mode
  if (input.mode === 'fresh') {
    // Fresh mode: only lesson images
    addImages(input.lessonImages);
  } else if (input.mode === 'refine') {
    // Refine mode: only presentation images
    addImages(input.presentationImages);
  } else {
    // Blend mode: both sources (limit each to 5 images to stay within token limits)
    addImages(input.lessonImages, 5);
    addImages(input.presentationImages, 5);
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.ARRAY, items: { type: Type.STRING } },
              speakerNotes: { type: Type.STRING, description: "Formatted with 👉. Count = Bullets + 1. NO REPETITION of slide text." },
              imagePrompt: { type: Type.STRING },
              layout: { type: Type.STRING, enum: ['split', 'full-image', 'center-text', 'flowchart', 'grid', 'tile-overlap'] },
              theme: { type: Type.STRING, enum: ['default', 'purple', 'blue', 'green', 'warm'] }
            },
            required: ['title', 'content', 'speakerNotes', 'imagePrompt']
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      ...item,
      id: `slide-${Date.now()}-${index}`,
      isGeneratingImage: false
    }));
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error("The AI Architect encountered an error. Check your connection.");
  }
};

export const generateSlideImage = async (apiKey: string, imagePrompt: string, layout?: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash-image"; 

  let aspectRatio = "4:3";
  let composition = "Cinematic composition, central subject.";

  if (layout === 'flowchart' || layout === 'full-image') {
      aspectRatio = "16:9";
      composition = "Wide cinematic landscape. Subject in focus.";
  } else if (layout === 'split' || layout === 'tile-overlap') {
      aspectRatio = "3:4";
      composition = "Vertical artistic composition. Subject to the right.";
  }

  try {
    const prompt = `${imagePrompt}. Style: Modern educational digital art, vibrant colors, semi-realistic graphic novel aesthetic. High detail, 4k. Composition: ${composition}`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { imageConfig: { aspectRatio: aspectRatio as any } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return undefined;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return undefined;
  }
};

export const generateResourceImage = async (apiKey: string, imagePrompt: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash-image"; 

  try {
    // We want a header/banner style image or a nice spot illustration
    const prompt = `${imagePrompt}. Style: Fun, kid-friendly vector illustration, bright colors, white background, simple flat design. Perfect for a school worksheet header.`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return undefined;
  } catch (error) {
    console.error("Resource Image Gen Error:", error);
    return undefined;
  }
};

export const generateQuickQuestion = async (
    apiKey: string,
    slideTitle: string,
    slideContent: string[],
    difficulty: 'Grade C' | 'Grade B' | 'Grade A'
  ): Promise<string> => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const systemInstruction = `
        You are a teaching assistant helper for a Year 6 (10-11 year old) class.
        Generate a single, short, oral question that the teacher can ask the class to check understanding of the current slide.

        DIFFICULTY LEVELS:
        - Grade C: Basic recall, simple observation, or "What is" questions. Easy confidence builder.
        - Grade B: Understanding, explaining in own words, or "How" questions. Moderate challenge.
        - Grade A: Critical thinking, prediction, synthesis, or "Why" questions. High challenge.

        OUTPUT RULES:
        - Output ONLY the question text.
        - Keep it conversational.
        - Do not include "Here is a question:" prefixes.
      `;

      const prompt = `Topic: ${slideTitle}\nKey Points on Slide: ${slideContent.join('; ')}\n\nGenerate a ${difficulty} question.`;

      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction }
        });
        return response.text?.trim() || "Could not generate question.";
      } catch (e) {
        return "Network error. Try again.";
      }
};

export const generateQuestionWithAnswer = async (
  apiKey: string,
  slideTitle: string,
  slideContent: string[],
  difficulty: 'A' | 'B' | 'C' | 'D' | 'E'
): Promise<QuestionWithAnswer> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const systemInstruction = `
    You are a teaching assistant helper for a Year 6 (10-11 year old) class.
    Generate a single oral question with an expected answer that the teacher can use as a teleprompter guide.

    BLOOM'S TAXONOMY DIFFICULTY MAPPING:
    - Grade E (Recall): "What is...", "Name the...", "List the..." - Pure factual recall.
    - Grade D (Comprehension): "Give an example of...", "Which one shows..." - Basic understanding.
    - Grade C (Understanding): "Describe in your own words", "What does X mean?" - Deeper understanding.
    - Grade B (Application): "How would you use...", "Explain how..." - Apply concepts.
    - Grade A (Analysis/Synthesis): "Why does X affect Y?", "What would happen if..." - Critical thinking.

    ANSWER FORMAT RULES:
    - Write a sample answer a good student would give.
    - Use **bold** around KEY POINTS the teacher should listen for.
    - Length:
      - Grade E/D: 1-2 sentences
      - Grade C: 2-3 sentences
      - Grade B/A: 2-3 sentences with deeper reasoning
    - Example: "The water cycle includes **evaporation**, **condensation**, and **precipitation**."

    OUTPUT RULES:
    - Question should be conversational and age-appropriate.
    - Answer should be natural, not robotic.
    - Bold the 2-4 most important key terms or concepts.
  `;

  const prompt = `Topic: ${slideTitle}\nKey Points on Slide: ${slideContent.join('; ')}\n\nGenerate a Grade ${difficulty} question with expected answer.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING, description: "Sample answer with **key points** bolded" }
          },
          required: ['question', 'answer']
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data as QuestionWithAnswer;
  } catch (e) {
    return {
      question: "Could not generate question",
      answer: "Please try again"
    };
  }
};

export const reviseSlide = async (apiKey: string, slide: Slide, instruction: string): Promise<Partial<Slide>> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const prompt = `
    Current Slide: ${JSON.stringify(slide)}
    Edit Instruction: "${instruction}"
    Return ONLY JSON with updated fields.
  `;

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
  } catch (error: any) {
    throw new AIProviderError(USER_ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', error);
  }

  try {
    return JSON.parse(response.text || "{}");
  } catch (parseError) {
    throw new AIProviderError(USER_ERROR_MESSAGES.PARSE_ERROR, 'PARSE_ERROR', parseError);
  }
};

export const generateContextualSlide = async (apiKey: string, lessonTopic: string, userInstruction: string, prevSlide?: Slide, nextSlide?: Slide): Promise<Slide> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const systemInstruction = `Create a new educational slide about ${lessonTopic}. Context: After "${prevSlide?.title || 'Start'}" and before "${nextSlide?.title || 'End'}". Request: "${userInstruction}"`;

    const response = await ai.models.generateContent({
        model,
        contents: "Generate JSON for new slide",
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.ARRAY, items: { type: Type.STRING } },
                    speakerNotes: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                    layout: { type: Type.STRING, enum: ['split', 'full-image', 'flowchart', 'grid', 'tile-overlap'] }
                },
                required: ['title', 'content', 'speakerNotes', 'imagePrompt']
            }
        }
    });

    const data = JSON.parse(response.text || "{}");
    return { ...data, id: `slide-ins-${Date.now()}`, isGeneratingImage: false };
};

export const generateExemplarSlide = async (apiKey: string, lessonTopic: string, prevSlide: Slide): Promise<Slide> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const systemInstruction = `
    You are an educational designer creating "Worked Examples" for Year 6 (10-11yo).
    Basis: Previous concept was "${prevSlide.title}". Content: ${prevSlide.content.join('; ')}.
    
    TASK: Create a slide that shows this strategy in action.
    1. Provide 3-4 bullet points showing a concrete example.
    2. STRICT SPEAKER NOTES (TELEPROMPTER LOGIC):
       - You MUST provide exactly (Number of Bullets + 1) segments separated by "👉".
       - Segment 0: INTRO: Briefly introduce the example.
       - Segment 1: Explain the first step (do NOT repeat the bullet text).
       - Segment 2: Explain the next step (do NOT repeat the previous explanation).
       - Ensure the script progresses logically.
    
    Do NOT miss the "👉" delimiter. Each reveal MUST have a corresponding script.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate an Exemplar slide for the topic: ${lessonTopic}. Use 'split' or 'grid' layout.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Should start with 'Exemplar:' or 'Worked Example:'" },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING, description: "Must follow the 👉 format: Intro 👉 Seg 1 👉 Seg 2... based on bullet count." },
          imagePrompt: { type: Type.STRING },
          layout: { type: Type.STRING, enum: ['split', 'full-image', 'flowchart', 'grid', 'tile-overlap'] }
        },
        required: ['title', 'content', 'speakerNotes', 'imagePrompt']
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return { ...data, id: `exemplar-${Date.now()}`, isGeneratingImage: false };
};

export const generateLessonResources = async (apiKey: string, lessonText: string, slideContext: string): Promise<LessonResource[]> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const systemInstruction = `
        You are an expert curriculum developer. 
        Your task is to analyze the provided Lesson Plan and the Slides created from it to identify 3-5 ESSENTIAL physical resources that a teacher would need to print.

        LOOK FOR:
        1. Referenced lists (e.g., "Animal list", "Vocabulary list").
        2. Differentiated worksheets mentioned in the plan (e.g., "Grade C support sheet", "Extension task card").
        3. Visual aids/infographics that were described but need to be printed (e.g., "Fact sheet").
        4. Assessment checklists or rubrics.

        TASK:
        Generate the FULL CONTENT for these resources.
        - **APPEARANCE**: Make it engaging for 10-11 year olds. Use Emojis in titles and section headers.
        - **FORMATTING**: Use proper MARKDOWN.
          - Use tables for structured data.
          - Use [ ] for checkboxes.
          - Use _________________ for writing lines.
        - **VISUALS**: Provide an 'imagePrompt' for a decorative header illustration (e.g., "Cartoon lizard holding a pencil").
    `;

    const prompt = `
        Original Lesson Plan Context:
        ${lessonText.substring(0, 3000)}...

        Slides Generated:
        ${slideContext.substring(0, 3000)}...

        Generate a JSON array of resources.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Include an emoji in the title!" },
                            type: { type: Type.STRING, enum: ['worksheet', 'handout', 'guide', 'list', 'quiz'] },
                            targetAudience: { type: Type.STRING, enum: ['student', 'teacher', 'support', 'extension'] },
                            content: { type: Type.STRING, description: "Full markdown content. Use bold, tables, emojis." },
                            imagePrompt: { type: Type.STRING, description: "Description for a kid-friendly header image." }
                        },
                        required: ['title', 'type', 'targetAudience', 'content', 'imagePrompt']
                    }
                }
            }
        });

        const data = JSON.parse(response.text || "[]");
        return data.map((item: any, i: number) => ({
            ...item,
            id: `res-${Date.now()}-${i}`
        }));
    } catch (e) {
        console.error("Resource Gen Error", e);
        return [];
    }
};

export interface QuizQuestion {
    question: string;
    options: string[]; // Array of 4 strings
    correctAnswerIndex: number; // 0-3
    explanation: string;
}

export interface QuestionWithAnswer {
  question: string;
  answer: string;  // Markdown with **bold** for key points
}

export const generateImpromptuQuiz = async (
    apiKey: string,
    slides: Slide[],
    currentIndex: number,
    numQuestions: number = 4
): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    // Gather context from slides up to current index
    const relevantSlides = slides.slice(0, currentIndex + 1);
    const contextText = relevantSlides.map((s, i) => `Slide ${i+1} (${s.title}): ${s.content.join('; ')}`).join('\n\n');

    const systemInstruction = `
        You are a fun and energetic Game Show Host for a Year 6 classroom.
        Generate a set of multiple-choice questions based strictly on the provided lesson content.
        
        RULES:
        1. Questions must be suitable for 10-11 year olds.
        2. Create ${numQuestions} questions.
        3. Each question must have exactly 4 options.
        4. Provide the correct answer index (0, 1, 2, or 3).
        5. Provide a short, encouraging explanation for the answer.
    `;

    const prompt = `
        CONTEXT (What the students have learned so far):
        ${contextText}

        Generate the quiz now.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must be exactly 4 options" },
                            correctAnswerIndex: { type: Type.INTEGER, description: "Index 0-3" },
                            explanation: { type: Type.STRING }
                        },
                        required: ['question', 'options', 'correctAnswerIndex', 'explanation']
                    }
                }
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (error) {
        console.error("Quiz Gen Error", error);
        return [];
    }
};
