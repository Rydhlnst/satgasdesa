import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { AppAlert as Alert } from "./feedback";

const MAX_IMAGE_EDGE = 1600;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function pickImagesFromCameraOrLibrary({
  max = 1,
  currentCount = 0,
  title = "Tambah foto",
  cameraPermissionMessage = "Izinkan kamera untuk mengambil foto.",
  libraryPermissionMessage = "Izinkan akses galeri untuk memilih foto.",
}: {
  max?: number;
  currentCount?: number;
  title?: string;
  cameraPermissionMessage?: string;
  libraryPermissionMessage?: string;
} = {}): Promise<ImagePicker.ImagePickerAsset[]> {
  const remaining = max - currentCount;
  if (remaining <= 0) {
    Alert.alert("Batas foto", `Maksimal ${max} foto dapat dilampirkan.`);
    return [];
  }

  return new Promise((resolve) => {
    let finished = false;
    const finish = (assets: ImagePicker.ImagePickerAsset[]) => {
      if (finished) return;
      finished = true;
      resolve(assets);
    };
    const choose = async (source: "camera" | "library") => {
      try {
        const permission = source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin diperlukan", source === "camera" ? cameraPermissionMessage : libraryPermissionMessage);
          finish([]);
          return;
        }
        const result = source === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.78 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: remaining > 1, selectionLimit: remaining, quality: 0.78 });
        finish(result.canceled ? [] : (result.assets ?? []).slice(0, remaining));
      } catch {
        Alert.alert("Tidak dapat memilih foto", "Periksa izin kamera atau galeri, lalu coba lagi.");
        finish([]);
      }
    };
    Alert.alert(title, "Pilih sumber foto.", [
      { text: "Kamera", onPress: () => void choose("camera") },
      { text: "Galeri", onPress: () => void choose("library") },
      { text: "Batal", style: "cancel", onPress: () => finish([]) },
    ], { cancelable: false });
  });
}

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
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Foto harus berukuran maksimal 10 MB.");
  const baseName = (asset.fileName ?? fallbackName).replace(/\.[^/.]+$/, "") || fallbackName;
  return { uri: result.uri, name: `${baseName}.jpg`, contentType: "image/jpeg", sizeBytes: blob.size };
}

export async function uploadOptimizedImage(uploadUrl: string, image: OptimizedImage, options: { maxAttempts?: number } = {}): Promise<void> {
  const response = await fetch(image.uri);
  const blob = await response.blob();
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Foto harus berukuran maksimal 10 MB.");
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": image.contentType }, body: blob });
      if (upload.ok) return;
      lastError = new Error(`Image upload failed (${upload.status}).`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Image upload failed.");
    }
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
  }
  throw lastError ?? new Error("Image upload failed.");
}
