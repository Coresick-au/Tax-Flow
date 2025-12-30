/**
 * Compresses an image file by resizing it and adjusting JPEG quality.
 * @param file The original image File object
 * @param maxWidth The maximum width of the output image (default 1920px)
 * @param quality The JPEG quality from 0 to 1 (default 0.7)
 * @returns A Promise that resolves to a compressed File object
 */
export async function compressImage(
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.7
): Promise<File> {
    return new Promise((resolve, reject) => {
        // Create an image object
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            // Draw to canvas
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG with reduced quality
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(img.src);
            reject(error);
        };
    });
}
