import type * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ImagePlus, X } from "lucide-react-native";

import { colors, radii, spacing, typography } from "../theme";
import { pickImagesFromCameraOrLibrary } from "../lib/media";

export function ImagePickerField({ label = "Foto", helper = "JPG, PNG, atau WEBP · akan dikompres otomatis", assets, max = 1, onChange }: { label?: string; helper?: string; assets: ImagePicker.ImagePickerAsset[]; max?: number; onChange: (assets: ImagePicker.ImagePickerAsset[]) => void }) {
  async function choose() {
    const selected = await pickImagesFromCameraOrLibrary({ max, currentCount: assets.length, title: assets.length ? "Tambah atau ganti foto" : "Pilih foto" });
    if (selected.length) onChange(max === 1 ? [selected[0]] : [...assets, ...selected].slice(0, max));
  }

  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}, pilih dari kamera atau galeri`} onPress={() => void choose()} style={styles.dropzone}><ImagePlus color={colors.primary} size={22} /><Text style={styles.title}>{assets.length ? "Tambah atau ganti foto" : "Kamera atau galeri"}</Text><Text style={styles.helper}>{helper}</Text></Pressable>{assets.length ? <View style={styles.previews}>{assets.map((asset) => <View key={asset.uri} style={styles.previewWrap}><Image source={{ uri: asset.uri }} style={styles.preview} /><Pressable accessibilityLabel="Hapus foto" hitSlop={6} onPress={() => onChange(assets.filter((item) => item.uri !== asset.uri))} style={styles.remove}><X color="#FFFFFF" size={13} /></Pressable></View>)}</View> : null}</View>;
}

const styles = StyleSheet.create({ field: { gap: 6 }, label: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "800" }, dropzone: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radii.lg, borderStyle: "dashed", borderWidth: 1, gap: 6, justifyContent: "center", minHeight: 112, padding: spacing.md }, title: { color: colors.primary, fontSize: typography.body, fontWeight: "900" }, helper: { color: colors.textMuted, fontSize: typography.micro, textAlign: "center" }, previews: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, previewWrap: { position: "relative" }, preview: { borderRadius: radii.md, height: 80, width: 80 }, remove: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 10, height: 22, justifyContent: "center", position: "absolute", right: -5, top: -5, width: 22 } });
