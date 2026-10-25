// src/utils/imageCompressor.ts
/**
 * Utility to compress images to WebP format with quality 0.85
 * Supports both File/Blob input and returns both base64 DataURL and Blob
 */

export interface CompressedImageResult {
  dataUrl: string;
  blob: Blob;
  sizeBytes: number;
  width: number;
  height: number;
  originalSizeBytes: number;
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function compressImageToWebP(
  file: File | Blob,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<CompressedImageResult> {
  // Refuse non-images and huge files before decoding them into memory
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Chỉ nhận ảnh JPG, PNG, WebP hoặc HEIC.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Ảnh lớn hơn ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Hãy chụp lại hoặc cắt bớt.`);
  }

  return new Promise((resolve, reject) => {
    const originalSizeBytes = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale while preserving aspect ratio if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2d context'));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP 85%
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to jpeg if browser doesn't support webp canvas export
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) {
                    reject(new Error('Failed to compress image'));
                    return;
                  }
                  const dataUrl = canvas.toDataURL('image/jpeg', quality);
                  resolve({
                    dataUrl,
                    blob: fallbackBlob,
                    sizeBytes: fallbackBlob.size,
                    width,
                    height,
                    originalSizeBytes,
                  });
                },
                'image/jpeg',
                quality
              );
              return;
            }

            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              dataUrl,
              blob,
              sizeBytes: blob.size,
              width,
              height,
              originalSizeBytes,
            });
          },
          'image/webp',
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
