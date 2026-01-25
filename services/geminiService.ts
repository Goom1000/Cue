
import { GoogleGenAI, Type } from "@google/genai";
import { Slide, LessonResource } from "../types";
import { GenerationInput, GenerationMode, AIProviderError, USER_ERROR_MESSAGES, GameQuestionRequest, SlideContext, BLOOM_DIFFICULTY_MAP, shuffleQuestionOptions } from './aiProvider';

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

const TELEPROMPTER_RULES_CONCISE = `
CONCISE SPEAKER NOTES (BULLET-POINT STYLE):
The teacher wants MINIMAL guidance - just key prompts to jog memory.

RULES:
- Output 2-3 short phrases per segment (not full sentences)
- Use comma-separated points, not prose
- Focus on: key term, quick example, one action
- NO transitions, NO elaborate explanations

FORMATTING:
Use "👉" as delimiter. Segments = Bullets + 1.
- Segment 0: One-liner setup (5-8 words)
- Segment N: 2-3 comma-separated prompts

EXAMPLE OUTPUT:
"Quick review of fractions 👉 denominator = parts total, numerator = parts we have 👉 example: 3/4 pizza, draw on board 👉 check: ask which is bigger, 1/2 or 1/4"
`;

const TELEPROMPTER_RULES_DETAILED = `
DETAILED SPEAKER NOTES (SCRIPT STYLE):
The teacher wants a FULL SCRIPT they can read verbatim for confident delivery.

RULES:
- Write complete sentences in conversational tone
- Include transition phrases: "Now let's look at...", "As you can see...", "So what does this mean?"
- Add prompts for student interaction: "[PAUSE for questions]", "[Wait for responses]"
- Include teacher actions: "[Point to diagram]", "[Write on board]"
- Each segment should be 3-5 sentences

FORMATTING:
Use "👉" as delimiter. Segments = Bullets + 1.
- Segment 0: Full introduction with hook and preview
- Segment N: Complete teaching script with examples and checks

EXAMPLE OUTPUT:
"Alright everyone, today we're going to explore something really interesting - fractions! [PAUSE] Has anyone ever shared a pizza with friends? That's exactly what fractions help us understand. 👉 So when we look at this first point, the denominator - that's the number on the bottom - tells us how many equal parts we've divided something into. Think of it like cutting a cake into slices. If we cut it into 4 pieces, our denominator is 4. [Point to example on board] Does that make sense so far? 👉 ..."
`;

/**
 * Get the appropriate teleprompter rules based on verbosity level.
 */
function getTeleprompterRulesForVerbosity(verbosity: VerbosityLevel = 'standard'): string {
  switch (verbosity) {
    case 'concise':
      return TELEPROMPTER_RULES_CONCISE;
    case 'detailed':
      return TELEPROMPTER_RULES_DETAILED;
    case 'standard':
    default:
      return TELEPROMPTER_RULES;
  }
}

/**
 * Get the appropriate system instruction based on generation mode.
 */
function getSystemInstructionForMode(mode: GenerationMode, verbosity: VerbosityLevel = 'standard'): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);
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

${teleprompterRules}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks, and 'grid' for Success Criteria/Differentiation.
`;

    case 'refine':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform an existing presentation into clean, less text-dense Cue-style slides.

CRITICAL RULE - CONTENT PRESERVATION:
**You MUST preserve ALL content from the original presentation.**
- Do NOT omit any slides, sections, activities, examples, or instructions.
- If the original has a "Daily Challenge" - include it.
- If the original has a "Worked Example" - include it.
- If something seems clunky or doesn't fit the Cue style, RESTRUCTURE it to fit - do NOT remove it.
- The teacher will decide what to remove later. Your job is to improve presentation, not edit content.

REFINE MODE RULES:
- Extract key concepts from the presentation provided.
- Create NEW Cue-style slides from scratch (do not preserve original formatting).
- You may split dense slides into multiple slides - but all original content must appear somewhere.
- You may reorder slides for better pedagogical flow.
- Note any images/diagrams that existed with "[Visual: description]" in the relevant bullet point so the teacher knows to re-add them.
- Output stands alone - no references to "original slide 3" or similar markers.
- Generate teleprompter scripts by inferring the teaching goals from the presentation content.

${teleprompterRules}

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
- Standardize ALL output to Cue style (do not try to match original presentation aesthetic).
- When lesson says X but presentation says Y, note the discrepancy in speakerNotes: "[Note: Sources differ on...]"
- Output stands alone - no references to source documents.
- Synthesize both sources into a cohesive teaching narrative for the teleprompter scripts.

${teleprompterRules}

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

  // Debug: Log verbosity being used for generation
  console.log('[GeminiService] generateLessonSlides - verbosity:', input.verbosity || 'undefined (defaulting to standard)');

  const systemInstruction = getSystemInstructionForMode(input.mode, input.verbosity);

  // Build contents array based on mode
  const contents: any[] = [];

  // Verbosity instruction to reinforce system prompt
  const verbosityLevel = input.verbosity || 'standard';
  const verbosityInstruction = verbosityLevel === 'concise'
    ? '\n\nIMPORTANT: Generate CONCISE speaker notes - brief bullet-point prompts only, 2-3 short phrases per segment.'
    : verbosityLevel === 'detailed'
    ? '\n\nIMPORTANT: Generate DETAILED speaker notes - full scripts the teacher can read verbatim, 3-5 complete sentences per segment with transitions and interaction prompts.'
    : ''; // standard uses default rules

  // Add text prompt based on mode
  if (input.mode === 'fresh') {
    contents.push({ text: `Transform this formal lesson plan into a sequence of teaching slides:${verbosityInstruction}\n\n${input.lessonText}` });
  } else if (input.mode === 'refine') {
    contents.push({ text: `Transform this existing presentation into clean, less text-dense Cue-style slides:${verbosityInstruction}\n\n${input.presentationText || ''}` });
  } else { // blend
    contents.push({ text: `Combine this lesson plan:\n\n${input.lessonText}\n\n---\n\nWith this existing presentation:\n\n${input.presentationText || ''}\n\nCreate enhanced Cue-style slides that incorporate content from both sources.${verbosityInstruction}` });
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

  // Build speakerNotes schema description based on verbosity
  const speakerNotesDescription = verbosityLevel === 'concise'
    ? "CONCISE style: 2-3 short comma-separated phrases per segment. Formatted with 👉. Count = Bullets + 1. NO REPETITION of slide text."
    : verbosityLevel === 'detailed'
    ? "DETAILED style: Full script with 3-5 complete sentences per segment. Include transitions like 'Now let's look at...' and interaction prompts like '[PAUSE for questions]'. Formatted with 👉. Count = Bullets + 1. NO REPETITION of slide text."
    : "Formatted with 👉. Count = Bullets + 1. NO REPETITION of slide text.";

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
              speakerNotes: { type: Type.STRING, description: speakerNotesDescription },
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

export const generateElaborateSlide = async (
  apiKey: string,
  lessonTopic: string,
  sourceSlide: Slide,
  allSlides: Slide[]
): Promise<Slide> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  // Build full presentation context for coherence
  const presentationContext = allSlides
    .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
    .join('\n');

  const systemInstruction = `
You are an educational designer creating "Elaborate" slides for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
You are expanding on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

PRESENTATION CONTEXT (maintain coherence, don't repeat earlier content):
${presentationContext}

TASK: Create a deeper-dive slide that helps students truly understand and apply this concept.

CONTENT REQUIREMENTS:
1. Title should reference the source (e.g., "More on [Topic]" or "[Topic]: Going Deeper")
2. ALWAYS include at least one analogy ("Think of it like...")
3. Focus on APPLICATION - show HOW to use the concept in practice
4. Match the tone of the source slide
5. Provide 3-5 content points mixing prose context with concrete examples
6. Format: Opening context point, then concrete examples/applications, then analogy

${TELEPROMPTER_RULES}

STRICT: You MUST provide exactly (Number of content points + 1) speaker note segments separated by "👉".
`;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate an Elaborate slide for: "${sourceSlide.title}". Use 'split' or 'grid' layout.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Reference source topic" },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING, description: "Must follow 👉 format" },
          imagePrompt: { type: Type.STRING },
          layout: { type: Type.STRING, enum: ['split', 'full-image', 'flowchart', 'grid', 'tile-overlap'] }
        },
        required: ['title', 'content', 'speakerNotes', 'imagePrompt']
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return { ...data, id: `elaborate-${Date.now()}`, isGeneratingImage: false, slideType: 'elaborate' };
};

export const generateWorkTogetherSlide = async (
  apiKey: string,
  lessonTopic: string,
  sourceSlide: Slide,
  allSlides: Slide[]
): Promise<Slide> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  // Build full presentation context for coherence
  const presentationContext = allSlides
    .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
    .join('\n');

  const systemInstruction = `
You are an educational designer creating "Work Together" collaborative activities for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
Creating activity based on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

PRESENTATION CONTEXT (maintain coherence):
${presentationContext}

TASK: Create a quick, engaging collaborative activity (2-3 minutes) for student pairs.

ACTIVITY REQUIREMENTS:
1. Design for PAIRS (2 students) as the primary grouping
2. ALWAYS include a group-of-3 variant (e.g., "If you're in a group of 3, one person can be the recorder" or "take turns")
3. Use ONLY basic classroom resources: pen, paper, whiteboard, mini-whiteboard
4. Do NOT require: tablets, computers, scissors, glue, colored materials, internet
5. Activity should reinforce the source slide content
6. Keep instructions clear and actionable for 10-11 year olds
7. Include a clear outcome (e.g., "Be ready to share one thing you discovered")

CONTENT FORMAT:
- Provide 3-5 content points as numbered instructions or prose
- Include the group-of-3 variant inline with the instructions (not as a separate point)
- Title should indicate collaboration (e.g., "Partner Challenge: [Topic]" or "Work Together: [Topic]")

${TELEPROMPTER_RULES}

STRICT: You MUST provide exactly (Number of content points + 1) speaker note segments separated by "👉".
The teleprompter script should include:
- Segment 0: INTRO - how to launch the activity and get pairs started
- Segments 1-N: What to say/observe during each phase of the activity
- Final segment: How to wrap up and transition (share-out if applicable)
`;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a Work Together collaborative activity slide for: "${sourceSlide.title}". Use 'work-together' layout.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Should indicate collaboration" },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING, description: "Must follow 👉 format" },
          imagePrompt: { type: Type.STRING },
          layout: { type: Type.STRING, enum: ['work-together'] }
        },
        required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout']
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    id: `work-together-${Date.now()}`,
    isGeneratingImage: false,
    slideType: 'work-together',
    layout: 'work-together'  // Ensure layout is set
  };
};

export const generateClassChallengeSlide = async (
  apiKey: string,
  lessonTopic: string,
  sourceSlide: Slide,
  allSlides: Slide[]
): Promise<Slide> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  // Build full presentation context for coherence
  const presentationContext = allSlides
    .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
    .join('\n');

  const systemInstruction = `
You are an educational designer creating "Class Challenge" slides for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
Creating challenge based on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

PRESENTATION CONTEXT (maintain coherence):
${presentationContext}

TASK: Create a Class Challenge slide for live student participation.
The teacher will type student contributions in real-time during the lesson.

CHALLENGE PROMPT REQUIREMENTS:
1. Write a SHORT, punchy challenge prompt/question (2-3 sentences max)
2. The prompt should check understanding of the source slide content
3. Make it open-ended to encourage multiple diverse responses
4. Phrase it to invite brainstorming (e.g., "What are all the ways...", "Name as many...", "What examples can you think of...")
5. Keep language simple and engaging for 10-11 year olds

SPEAKER NOTES (FACILITATION TIPS):
The teleprompter should help the teacher run the activity effectively:
- Segment 0: INTRO - How to launch the challenge, set expectations (e.g., "Hands up with ideas, I'll type them")
- Segment 1: DURING - What to say while collecting responses, prompts to encourage more ideas
- Segment 2: WRAP-UP - How to summarize, acknowledge contributions, transition

Use "👉" as delimiter between segments (exactly 3 segments).

CONTENT ARRAY:
Provide 1-2 brief instruction bullets for the slide (optional, can be empty if the prompt is self-explanatory).
These appear below the challenge prompt if provided.

TITLE:
Use "Class Challenge" or a variation like "Challenge Time" or "Quick Challenge".
`;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a Class Challenge slide for: "${sourceSlide.title}". Use 'class-challenge' layout.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Should be 'Class Challenge' or similar" },
          content: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-2 brief instructions (optional)" },
          speakerNotes: { type: Type.STRING, description: "Facilitation tips with 👉 format (3 segments)" },
          challengePrompt: { type: Type.STRING, description: "The main challenge question (2-3 sentences)" },
          imagePrompt: { type: Type.STRING }
        },
        required: ['title', 'content', 'speakerNotes', 'challengePrompt', 'imagePrompt']
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    id: `class-challenge-${Date.now()}`,
    isGeneratingImage: false,
    slideType: 'class-challenge',
    layout: 'class-challenge',
    backgroundColor: '#ea580c',  // Orange-600 theme
    contributions: []  // Initialize empty contributions array
  };
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

export interface PhoneAFriendResponse {
    confidence: 'high' | 'medium' | 'low';
    response: string;
}

export const generatePhoneAFriendHint = async (
    apiKey: string,
    question: string,
    options: string[]
): Promise<PhoneAFriendResponse> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const systemInstruction = `
You are a helpful friend receiving a phone call on "Who Wants to Be a Millionaire."
You have 30 seconds to help.

IMPORTANT: Vary your response style randomly. Pick ONE of these approaches:
1. CONFIDENT: "I'm pretty sure it's [X] because..."
2. REASONING: "Well, I know that [fact], so it might be..."
3. ELIMINATION: "I don't think it's [X] or [Y], so maybe..."
4. UNCERTAIN: "Hmm, this is tricky. My best guess would be..."

RULES:
- Keep response under 50 words (it's a timed call!)
- Sound natural, like a real phone conversation
- Never say "I am an AI" or break character
- Sometimes be intentionally wrong or uncertain (maybe 15% of the time for realism)
- Match response style to confidence level randomly
- You should genuinely reason about the question - DO NOT just pick randomly
    `;

    const prompt = `
Question: ${question}
Options:
A) ${options[0]}
B) ${options[1]}
C) ${options[2]}
D) ${options[3]}

Provide your phone-a-friend response.
    `;

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
                        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                        response: { type: Type.STRING, description: "Natural phone conversation response, under 50 words" }
                    },
                    required: ['confidence', 'response']
                }
            }
        });

        return JSON.parse(response.text || '{"confidence":"low","response":"Sorry, I\'m not sure on this one."}');
    } catch (e) {
        return { confidence: 'low', response: "The connection cut out! I couldn't hear the question properly." };
    }
};

// Helper function for Millionaire progressive difficulty rules
function getMillionaireProgressionRules(count: 3 | 5 | 10): string {
  if (count === 3) {
    return `
Question 1: EASY (Remember/Understand) - "What is...", "Name the..."
Question 2: MEDIUM (Apply/Analyze) - "How would...", "What would happen..."
Question 3: HARD (Evaluate/Create) - "Why does...", "What is the best..."`;
  }
  if (count === 5) {
    return `
Questions 1-2: EASY (Remember/Understand) - "What is...", "Name the..."
Questions 3-4: MEDIUM (Apply/Analyze) - "How would...", "What would happen..."
Question 5: HARD (Evaluate/Create) - "Why does...", "What is the best..."`;
  }
  // count === 10
  return `
Questions 1-3: EASY (Remember/Understand) - "What is...", "Name the..."
Questions 4-6: MEDIUM (Apply/Analyze) - "How would...", "What would happen..."
Questions 7-10: HARD (Evaluate/Create) - "Why does...", "What is the best..."`;
}

export const generateGameQuestions = async (
  apiKey: string,
  request: GameQuestionRequest
): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  // Build system instruction based on game type
  let systemInstruction: string;

  if (request.gameType === 'millionaire') {
    systemInstruction = `
You are a friendly quiz master creating "Who Wants to Be a Millionaire" style questions for Year 6 students (10-11 years old).

LANGUAGE FOR 10 YEAR OLDS (CRITICAL):
- Use simple, everyday words a child would know
- Keep sentences SHORT (under 15 words)
- Avoid technical jargon - if you must use a term, define it in the question
- Ask ONE clear thing per question
- Write like you're talking to a child: "What is..." not "Which of the following represents..."
- BAD: "What phenomenon causes precipitation to occur?"
- GOOD: "What causes rain to fall from clouds?"

PROGRESSIVE DIFFICULTY RULES (Bloom's Taxonomy):
${getMillionaireProgressionRules(request.questionCount as 3 | 5 | 10)}

DISTRACTOR RULES (CRITICAL):
- All 4 options must be similar in length and specificity
- Distractors must be plausible misconceptions a student might have
- Never include "All of the above" or "None of the above"
- Avoid using negatives in questions ("Which is NOT...")
- Keep each option to 1-5 words when possible

CONTENT CONSTRAINT (CRITICAL):
- Generate questions ONLY from the provided lesson content
- Do NOT use external knowledge beyond what is in the slides
- If content is thin, focus on what IS there rather than inventing new facts

OUTPUT FORMAT:
Return a JSON array with exactly ${request.questionCount} questions.
`;
  } else {
    // Chase or Beat the Chaser - consistent difficulty
    const difficultyConfig = BLOOM_DIFFICULTY_MAP[request.difficulty];
    systemInstruction = `
You are a friendly quiz master creating rapid-fire questions for "Beat the Chaser" style game for Year 6 students (10-11 years old).

LANGUAGE FOR 10 YEAR OLDS (CRITICAL):
- Use simple, everyday words a child would know
- Keep questions SHORT (under 12 words)
- Avoid technical jargon - if you must use a term, add a hint
- Write like you're talking to a child: "What is..." not "Which of the following..."
- BAD: "What literary device involves giving human qualities to non-human things?"
- GOOD: "What do we call it when we describe a tree as 'dancing' in the wind?"

DIFFICULTY: ${request.difficulty.toUpperCase()}
${difficultyConfig.description}
Question types: ${difficultyConfig.questionTypes}

ALL questions must be at ${request.difficulty} level. No progression - consistent difficulty throughout.

QUICK-FIRE RULES:
- Questions should be answerable in 3-5 seconds
- Single concept per question, no multi-part questions
- Avoid ambiguous wording
- Keep options to 1-4 words each

DISTRACTOR RULES:
- All 4 options must be plausible
- Distractors should reflect common misconceptions
- Similar length and specificity across all options

CONTENT CONSTRAINT (CRITICAL):
- Generate questions ONLY from the provided lesson content
- Do NOT use external knowledge beyond what is in the slides

OUTPUT FORMAT:
Return a JSON array with exactly ${request.questionCount} questions.
`;
  }

  // Build prompt with slide context
  let prompt = `
LESSON CONTENT (Generate questions from this material only):
Topic: ${request.slideContext.lessonTopic}

${request.slideContext.cumulativeContent}

Current slide focus: ${request.slideContext.currentSlideTitle}
Key points: ${request.slideContext.currentSlideContent.join('; ')}
`;

  // Add teacher hints if provided
  if (request.optionalHints) {
    prompt += `\n\nTEACHER HINTS: ${request.optionalHints}`;
  }

  prompt += '\n\nGenerate the quiz now.';

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

    const questions = JSON.parse(response.text || "[]");
    // Shuffle options so correct answer isn't always "A"
    return shuffleQuestionOptions(questions);
  } catch (error) {
    console.error("Game Question Gen Error", error);
    return [];
  }
};

export type VerbosityLevel = 'concise' | 'standard' | 'detailed';

export const regenerateTeleprompter = async (
    apiKey: string,
    slide: Slide,
    verbosity: VerbosityLevel,
    prevSlide?: Slide,
    nextSlide?: Slide
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const rules = verbosity === 'concise'
        ? TELEPROMPTER_RULES_CONCISE
        : verbosity === 'detailed'
        ? TELEPROMPTER_RULES_DETAILED
        : TELEPROMPTER_RULES; // standard - existing behavior

    // Build context section for surrounding slides
    const contextLines: string[] = [];
    if (prevSlide) {
        contextLines.push(`- Previous slide: "${prevSlide.title}" covered: ${prevSlide.content.slice(0, 2).join('; ')}`);
    } else {
        contextLines.push('- This is the first slide in the presentation.');
    }
    if (nextSlide) {
        contextLines.push(`- Next slide: "${nextSlide.title}" will cover: ${nextSlide.content.slice(0, 2).join('; ')}`);
    } else {
        contextLines.push('- This is the last slide in the presentation.');
    }

    const contextSection = `
CONTEXT FOR COHERENT FLOW:
${contextLines.join('\n')}
Ensure your script transitions naturally from what came before and sets up what comes next.
`;

    const systemInstruction = `
You are regenerating teleprompter notes for an existing slide.
The slide has ${slide.content.length} bullet points.

${contextSection}

${rules}

CRITICAL: Output ONLY the speaker notes text. No JSON, no markdown code blocks, no explanations.
`;

    const prompt = `
Slide Title: ${slide.title}
Slide Content:
${slide.content.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Generate speaker notes in ${verbosity} style.
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "text/plain"
            }
        });

        return response.text?.trim() || "";
    } catch (error) {
        console.error("Teleprompter Regeneration Error:", error);
        throw new AIProviderError(USER_ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', error);
    }
};
