export const MAX_COMPRESSED_IMAGE_BYTES = 2.5 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;

export type CompressedImage = {
  file: File;
  originalSize: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be read."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The selected image could not be optimized."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const image = await loadImage(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  let scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
  let quality = 0.82;
  let outputType = "image/webp";
  let blob: Blob;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image optimization is not supported by this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    blob = await canvasToBlob(canvas, outputType, quality);
    if (blob.type === "image/webp" || outputType === "image/jpeg") {
      if (blob.size <= MAX_COMPRESSED_IMAGE_BYTES || attempt === 3) break;
    } else {
      outputType = "image/jpeg";
      quality = 0.8;
      continue;
    }

    quality -= 0.1;
    if (quality < 0.55) {
      quality = 0.75;
      scale *= 0.85;
    }
  }

  const extension = blob!.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "") || "inspection-photo";
  const optimizedFile = new File([blob!], `${baseName}.${extension}`, { type: blob!.type, lastModified: Date.now() });
  return { file: optimizedFile, originalSize: file.size };
}
