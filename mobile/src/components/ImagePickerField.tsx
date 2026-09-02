import type * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react-native";

import { colors, radii, spacing, typography } from "../theme";
import { pickImagesFromSource, type ImageSource } from "../lib/media";
import { ImageSourceSheet } from "./ImageSourceSheet";

export function ImagePickerField({ label = "Foto", helper = "JPG, PNG, atau WEBP · akan dikompres otomatis", assets, max = 1, onChange }: { label?: string; helper?: string; assets: ImagePicker.ImagePickerAsset[]; max?: number; onChange: (assets: ImagePicker.ImagePickerAsset[]) => void }) {
  const [selecting, setSelecting] = useState(false); const [sourceOpen, setSourceOpen] = useState(false);
  async function choose(source: ImageSource) {
    if (selecting) return;
    setSourceOpen(false); setSelecting(true);
    try { const selected = await pickImagesFromSource(source, { max, currentCount: assets.length }); if (selected.length) onChange(max === 1 ? [selected[0]] : [...assets, ...selected].slice(0, max)); } finally { setSelecting(false); }
  }

  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}, buka kamera atau galeri`} accessibilityState={{ busy: selecting, disabled: selecting }} disabled={selecting} onPress={() => setSourceOpen(true)} style={[styles.dropzone, selecting && styles.disabled]}>{selecting ? <ActivityIndicator color={colors.primary} /> : <View style={styles.sourceIcons}><Camera color={colors.primary} size={22} /><ImagePlus color={colors.primary} size={22} /></View>}<Text style={styles.title}>{selecting ? "Menyiapkan foto…" : assets.length ? "Tambah atau ganti foto" : "Tambah foto"}</Text><Text style={styles.helper}>{helper}</Text></Pressable>{assets.length ? <View style={styles.previews}>{assets.map((asset) => <View key={asset.uri} style={styles.previewWrap}><Image accessibilityLabel={`${label} preview`} alt={`${label} preview`} source={{ uri: asset.uri }} style={styles.preview} /><Pressable accessibilityRole="button" accessibilityLabel="Hapus foto" hitSlop={6} onPress={() => onChange(assets.filter((item) => item.uri !== asset.uri))} style={styles.remove}><X color="#FFFFFF" size={13} /></Pressable></View>)}</View> : null}<ImageSourceSheet title={assets.length ? "Tambah atau ganti foto" : "Pilih foto"} visible={sourceOpen} onClose={() => setSourceOpen(false)} onSelect={(source) => void choose(source)} /></View>;
}

const styles = StyleSheet.create({ field: { gap: 6 }, label: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "800" }, dropzone: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radii.lg, borderStyle: "dashed", borderWidth: 1, gap: 6, justifyContent: "center", minHeight: 112, padding: spacing.md }, disabled: { opacity: 0.65 }, sourceIcons: { alignItems: "center", flexDirection: "row", gap: 8 }, title: { color: colors.primary, fontSize: typography.body, fontWeight: "900" }, helper: { color: colors.textMuted, fontSize: typography.micro, textAlign: "center" }, previews: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, previewWrap: { position: "relative" }, preview: { borderRadius: radii.md, height: 80, width: 80 }, remove: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 16, height: 32, justifyContent: "center", position: "absolute", right: -8, top: -8, width: 32 } });
