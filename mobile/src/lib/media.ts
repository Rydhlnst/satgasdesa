import * as ImageManipulator from "expo-image-manipulator";
import type * as ImagePicker from "expo-image-picker";

const MAX_IMAGE_EDGE = 1600;

export type OptimizedImage = {
  uri: string;
  name: string;
  contentType: "image/jpeg";
  sizeBytes: number;
};

export async function optimizeImage(asset: ImagePicker.ImagePickerAsset, fallbackName: string): Promise<OptimizedImage> {
  const longestEdge = Math.max(asset.width, asset.height);
  const actions = longestEdge > MAX_IMAGE_EDGE
    ? [{ resize: longestEdge === asset.width ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE } }]
    : [];
  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG });
  const response = await fetch(result.uri);
  const blob = await response.blob();
  if (!blob.size) throw new Error("The optimized image is empty.");
  const baseName = (asset.fileName ?? fallbackName).replace(/\.[^/.]+$/, "") || fallbackName;
  return { uri: result.uri, name: `${baseName}.jpg`, contentType: "image/jpeg", sizeBytes: blob.size };
}

export async function uploadOptimizedImage(uploadUrl: string, image: OptimizedImage): Promise<void> {
  const response = await fetch(image.uri);
  const blob = await response.blob();
  const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": image.contentType }, body: blob });
  if (!upload.ok) throw new Error("Image upload failed.");
}
