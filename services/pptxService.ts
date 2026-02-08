import { Slide } from "../types";
import { ColleagueTransformationResult } from './aiProvider';

export const exportToPowerPoint = (slides: Slide[], title: string) => {
  if (!window.PptxGenJS) {
    alert("PowerPoint generator library not loaded.");
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; // Or 4x3 based on preference
  pptx.title = title || "Lesson Plan";

  slides.forEach((slide) => {
    const pptSlide = pptx.addSlide();
    
    // Background color
    pptSlide.background = { color: "F0F9FF" };

    // Title
    pptSlide.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 1,
      fontSize: 32,
      fontFace: "Arial", // Standard safe font
      color: "1e293b",
      bold: true,
    });

    // Content
    if (slide.layout === 'full-image' && slide.imageUrl) {
         pptSlide.addImage({
            data: slide.imageUrl,
            x: 0,
            y: 0,
            w: "100%",
            h: "100%"
         });
         // Add title overlay
         pptSlide.addText(slide.title, {
            x: 0, y: 0.2, w: '100%', h: 1,
            fontSize: 44, align: 'center', color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 10 }
         });
    } else {
        // Normal split layout
        const hasImage = !!slide.imageUrl;

        // Bullets
        pptSlide.addText(slide.content.map(c => ({ text: c, options: { breakLine: true } })), {
            x: 0.5,
            y: 1.8,
            w: hasImage ? "45%" : "90%",
            h: 4.5,
            fontSize: 24,
            color: "334155",
            bullet: true,
            paraSpaceBefore: 10
        });

        // Image
        if (hasImage && slide.imageUrl) {
            pptSlide.addImage({
                data: slide.imageUrl,
                x: 5.2,
                y: 1.8,
                w: 4.5,
                h: 3.5,
                sizing: { type: "contain", w: 4.5, h: 3.5 }
            });
        }
    }

    // Speaker Notes
    if (slide.speakerNotes) {
      pptSlide.addNotes(slide.speakerNotes);
    }
  });

  pptx.writeFile({ fileName: `${title || 'Lesson'}.pptx` });
};

/**
 * Export AI-transformed talking-point bullets as a script-mode PPTX file.
 * Layout is optimized for expanded text readability (16pt bullets, small thumbnail).
 * Only slides present in transformationResult are included (skipped slides omitted).
 */
export const exportScriptPptx = (
  slides: Slide[],
  transformationResult: ColleagueTransformationResult,
  title: string
): void => {
  if (!window.PptxGenJS) {
    alert("PowerPoint generator library not loaded.");
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = `${title} - Script Version`;

  transformationResult.slides.forEach((transformed) => {
    // Look up original slide with safety check
    const originalSlide = slides[transformed.slideIndex];
    if (!originalSlide) return;

    // Determine image source: pasted original takes priority (per MEMORY.md)
    const imageSource = originalSlide.originalPastedImage || originalSlide.imageUrl;
    const hasImage = !!imageSource;

    const pptSlide = pptx.addSlide();

    // White background for script-mode readability
    pptSlide.background = { color: "FFFFFF" };

    // Title - narrower when image thumbnail is present
    pptSlide.addText(transformed.originalTitle, {
      x: 0.5,
      y: 0.3,
      w: hasImage ? 6.5 : 9.0,
      h: 0.6,
      fontSize: 18,
      fontFace: "Arial",
      color: "1e293b",
      bold: true,
      valign: "top",
    });

    // Image thumbnail in top-right (only when image exists)
    if (hasImage && imageSource) {
      pptSlide.addImage({
        data: imageSource,
        x: 7.2,
        y: 0.3,
        w: 2.5,
        h: 1.9,
        sizing: { type: "contain", w: 2.5, h: 1.9 },
      });
    }

    // Expanded talking-point bullets - strip markdown bold markers
    const bulletRuns = transformed.expandedBullets.map((bullet) => ({
      text: bullet.replace(/\*\*/g, ''),
      options: { breakLine: true },
    }));

    pptSlide.addText(bulletRuns, {
      x: 0.5,
      y: 1.3,
      w: hasImage ? 6.5 : 9.0,
      h: 4.0,
      fontSize: 16,
      fontFace: "Arial",
      color: "334155",
      bullet: true,
      paraSpaceBefore: 6,
      lineSpacingMultiple: 1.15,
      valign: "top",
      fit: "shrink",
    });

    // Speaker notes with prefix to distinguish from on-slide bullets
    if (originalSlide.speakerNotes) {
      pptSlide.addNotes(
        `Original teleprompter script:\n\n${originalSlide.speakerNotes}`
      );
    }
  });

  // Sanitize filename: strip illegal characters, fallback to 'Lesson'
  const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').trim() || 'Lesson';
  pptx.writeFile({ fileName: `${sanitizedTitle} - Script Version.pptx` });
};