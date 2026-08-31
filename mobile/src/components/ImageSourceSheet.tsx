import { Camera, Images, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ImageSource } from "../lib/media";
import { colors, radii, spacing } from "../theme";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader } from "./ui/modal";

export function ImageSourceSheet({ visible, title, onClose, onSelect }: { visible: boolean; title: string; onClose: () => void; onSelect: (source: ImageSource) => void }) {
  return <Modal isOpen={visible} onClose={onClose} size="full">
    <ModalBackdrop />
    <ModalContent className="mt-auto w-full rounded-t-3xl rounded-b-none p-5 pb-safe">
      <ModalHeader><View style={styles.header}><Text style={styles.title}>{title}</Text><Pressable accessibilityLabel="Tutup pilihan foto" accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.close}><X color={colors.textStrong} size={20} /></Pressable></View></ModalHeader>
      <ModalBody><View style={styles.options}><Pressable accessibilityLabel="Ambil foto dengan kamera" accessibilityRole="button" onPress={() => onSelect("camera")} style={({ pressed }) => [styles.option, pressed && styles.pressed]}><Camera color={colors.primary} size={25} /></Pressable><Pressable accessibilityLabel="Pilih foto dari galeri" accessibilityRole="button" onPress={() => onSelect("library")} style={({ pressed }) => [styles.option, pressed && styles.pressed]}><Images color={colors.primary} size={25} /></Pressable></View></ModalBody>
    </ModalContent>
  </Modal>;
}

const styles = StyleSheet.create({ header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, title: { color: colors.textStrong, fontSize: 18, fontWeight: "900" }, close: { alignItems: "center", borderRadius: radii.pill, height: 40, justifyContent: "center", width: 40 }, options: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", paddingVertical: spacing.sm }, option: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, height: 56, justifyContent: "center", width: 72 }, pressed: { opacity: 0.7 } });
