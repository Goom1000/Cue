import { Slide } from "../types";

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