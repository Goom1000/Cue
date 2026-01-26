import { Slide, PosterLayout } from '../types';
import { ClaudeProvider } from './providers/claudeProvider';
import { AIProviderError } from './aiProvider';

/**
 * Build context string from surrounding slides for AI understanding.
 * Provides 2-3 slides before/after the target slide.
 *
 * @param slides All slides in the presentation
 * @param targetIndex Index of the slide being converted to poster
 * @param contextWindow Number of slides before/after to include (default: 2)
 */
export function buildSlideContext(
  slides: Slide[],
  targetIndex: number,
  contextWindow: number = 2
): string {
  const start = Math.max(0, targetIndex - contextWindow);
  const end = Math.min(slides.length, targetIndex + contextWindow + 1);

  const contextSlides = slides.slice(start, end).map((slide, i) => {
    const actualIndex = start + i;
    const position = actualIndex === targetIndex ? '[TARGET]' : '';
    const bulletPoints = slide.content.join('\n  - ');
    return `Slide ${actualIndex + 1} ${position}: ${slide.title}\n  - ${bulletPoints}`;
  });

  return contextSlides.join('\n\n---\n\n');
}

/**
 * Infer subject from presentation content.
 * Checks first slide title and content for common subject keywords.
 */
export function inferSubject(slides: Slide[]): string {
  if (slides.length === 0) return 'General';

  const firstSlide = slides[0];
  const allText = `${firstSlide.title} ${firstSlide.content.join(' ')}`.toLowerCase();

  // Subject detection heuristics
  if (/math|number|fraction|equation|geometry|algebra/.test(allText)) return 'Mathematics';
  if (/science|experiment|biology|chemistry|physics|nature/.test(allText)) return 'Science';
  if (/english|grammar|writing|reading|literature|poem|story/.test(allText)) return 'English';
  if (/history|ancient|war|century|civilization|historical/.test(allText)) return 'History';
  if (/geography|map|country|climate|continent|earth/.test(allText)) return 'Geography';
  if (/art|music|drama|creative|design/.test(allText)) return 'Creative Arts';

  return 'General';
}

export interface PosterGenerationProgress {
  current: number;
  total: number;
  status: 'generating' | 'complete' | 'error';
  error?: string;
}

export type PosterProgressCallback = (progress: PosterGenerationProgress) => void;

/**
 * Generate poster layouts for multiple slides.
 * Uses sequential generation to manage memory and provide progress updates.
 *
 * @param slides All slides in the presentation
 * @param selectedIndices Indices of slides to convert to posters
 * @param apiKey Claude API key
 * @param onProgress Callback for progress updates
 * @returns Array of PosterLayout objects in same order as selectedIndices
 */
export async function generatePosterLayouts(
  slides: Slide[],
  selectedIndices: number[],
  apiKey: string,
  onProgress?: PosterProgressCallback
): Promise<PosterLayout[]> {
  const provider = new ClaudeProvider(apiKey);
  const subject = inferSubject(slides);
  const layouts: PosterLayout[] = [];

  for (let i = 0; i < selectedIndices.length; i++) {
    const targetIndex = selectedIndices[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: selectedIndices.length,
        status: 'generating'
      });
    }

    try {
      const context = buildSlideContext(slides, targetIndex);
      const layout = await provider.generatePosterLayout(context, subject);
      layouts.push(layout);
    } catch (error) {
      // On error, report and rethrow to stop batch
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: selectedIndices.length,
          status: 'error',
          error: error instanceof AIProviderError ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  }

  if (onProgress) {
    onProgress({
      current: selectedIndices.length,
      total: selectedIndices.length,
      status: 'complete'
    });
  }

  return layouts;
}

// Re-export types for convenience
export type { PosterLayout, PosterSection } from '../types';
