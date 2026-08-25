import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ImagePlus, X } from "lucide-react-native";

import { colors, spacing } from "../theme";

export function ImagePickerField({ label = "Foto", helper = "JPG, PNG, atau WEBP · akan dikompres otomatis", assets, max = 1, onChange }: { label?: string; helper?: string; assets: ImagePicker.ImagePickerAsset[]; max?: number; onChange: (assets: ImagePicker.ImagePickerAsset[]) => void }) {
  async function choose() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: max > 1, selectionLimit: max, quality: 0.78 });
    if (!result.canceled) onChange([...assets, ...(result.assets ?? [])].slice(0, max));
  }

  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable onPress={() => void choose()} style={styles.dropzone}><ImagePlus color={colors.primary} size={22} /><Text style={styles.title}>{assets.length ? "Tambah atau ganti foto" : "Pilih foto"}</Text><Text style={styles.helper}>{helper}</Text></Pressable>{assets.length ? <View style={styles.previews}>{assets.map((asset) => <View key={asset.uri} style={styles.previewWrap}><Image source={{ uri: asset.uri }} style={styles.preview} /><Pressable accessibilityLabel="Hapus foto" hitSlop={6} onPress={() => onChange(assets.filter((item) => item.uri !== asset.uri))} style={styles.remove}><X color="#FFFFFF" size={13} /></Pressable></View>)}</View> : null}</View>;
}

const styles = StyleSheet.create({ field: { gap: 6 }, label: { color: colors.text, fontSize: 11, fontWeight: "800" }, dropzone: { alignItems: "center", backgroundColor: "#F5F8FF", borderColor: "#B8CCF5", borderRadius: 12, borderStyle: "dashed", borderWidth: 1, gap: 5, justifyContent: "center", minHeight: 108, padding: spacing.md }, title: { color: colors.primary, fontSize: 12, fontWeight: "900" }, helper: { color: colors.textMuted, fontSize: 10, textAlign: "center" }, previews: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, previewWrap: { position: "relative" }, preview: { borderRadius: 9, height: 76, width: 76 }, remove: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 10, height: 20, justifyContent: "center", position: "absolute", right: -5, top: -5, width: 20 } });
