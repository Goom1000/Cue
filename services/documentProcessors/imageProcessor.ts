/**
 * Image Processor - Generate thumbnail and preserve full resolution
 * Uses native FileReader and Canvas APIs
 */

export interface ImageProcessResult {
  thumbnail: string;
  pageCount: 1;
  type: 'image';
  base64: string;  // Full resolution for AI processing
}

/**
 * Process an image file to generate thumbnail and preserve original.
 * Throws error with code 'PROCESSING_ERROR' on failure.
 */
export async function processImage(file: File): Promise<ImageProcessResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64 = e.target?.result as string;

      const img = new Image();
      img.onload = () => {
        // Generate thumbnail by resizing to max 200px dimension
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve({
          thumbnail: canvas.toDataURL('image/jpeg', 0.7),
          pageCount: 1,
          type: 'image',
          base64
        });
      };

      img.onerror = () => reject({
        code: 'PROCESSING_ERROR',
        message: 'Failed to load image'
      });

      img.src = base64;
    };

    reader.onerror = () => reject({
      code: 'PROCESSING_ERROR',
      message: 'Failed to read image file'
    });

    reader.readAsDataURL(file);
  });
}
