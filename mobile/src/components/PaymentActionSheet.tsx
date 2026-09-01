import { Check, ChevronRight, Eye, MapPinCheck, RotateCcw, X } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../theme";
import { StatusPill } from "./PimpinanPrimitives";
import { RemoteImage } from "./RemoteImage";

type ActionTone = "primary" | "success" | "danger" | "neutral";

type PaymentAction = {
  label: string;
  onPress: () => void | Promise<void>;
  tone?: ActionTone;
  icon: "evidence" | "verify" | "confirm" | "reject" | "reverse";
};

export function PaymentActionSheet({
  visible,
  onClose,
  amount,
  detail,
  status,
  statusTone,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  amount: string;
  detail: string;
  status: string;
  statusTone: "green" | "red" | "orange" | "blue" | "gray";
  actions: PaymentAction[];
}) {
  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <SafeAreaView edges={["bottom"]} style={styles.modalRoot}>
      <Pressable accessibilityLabel="Tutup tindakan pembayaran" style={styles.backdrop} onPress={onClose} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.amount}>{amount}</Text>
            <Text numberOfLines={2} style={styles.detail}>{detail}</Text>
          </View>
          <StatusPill tone={statusTone}>{status}</StatusPill>
        </View>
        <Text style={styles.label}>TINDAKAN PEMBAYARAN</Text>
        <View style={styles.actionList}>{actions.map((action) => <PaymentActionRow key={action.label} action={action} />)}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} style={styles.closeButton}><Text style={styles.closeLabel}>Tutup</Text></Pressable>
      </View>
    </SafeAreaView>
  </Modal>;
}

export function PaymentEvidenceViewer({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) {
  return <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
    <SafeAreaView edges={["top", "bottom"]} style={styles.viewerRoot}>
      <View style={styles.viewerHeader}><Text style={styles.viewerTitle}>Bukti pembayaran</Text><Pressable accessibilityRole="button" accessibilityLabel="Tutup bukti pembayaran" onPress={onClose} style={styles.viewerClose}><X color="#FFFFFF" size={20} /><Text style={styles.viewerCloseText}>Tutup</Text></Pressable></View>
      <View style={styles.viewerImageWrap}>{uri ? <RemoteImage accessibilityLabel="Bukti pembayaran" resizeMode="contain" uri={uri} style={styles.viewerImage} /> : null}</View>
    </SafeAreaView>
  </Modal>;
}

function PaymentActionRow({ action }: { action: PaymentAction }) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const icon = action.icon === "evidence" ? <Eye color={colors.primary} size={19} /> : action.icon === "verify" ? <MapPinCheck color={colors.primary} size={19} /> : action.icon === "confirm" ? <Check color={colors.success} size={19} /> : action.icon === "reject" ? <X color={colors.danger} size={19} /> : <RotateCcw color={colors.danger} size={19} />;
  const tone = action.tone ?? "neutral";
  async function handlePress() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try { await action.onPress(); } finally { inFlight.current = false; setPending(false); }
  }
  return <Pressable accessibilityRole="button" accessibilityState={{ busy: pending, disabled: pending }} disabled={pending} onPress={() => void handlePress()} style={({ pressed }) => [styles.actionRow, tone === "danger" && styles.actionRowDanger, pressed && styles.pressed]}>
    <View style={[styles.actionIcon, tone === "danger" && styles.actionIconDanger, tone === "success" && styles.actionIconSuccess]}>{icon}</View>
    <Text style={[styles.actionLabel, tone === "danger" && styles.actionLabelDanger]}>{action.label}</Text>
    {pending ? <ActivityIndicator color={tone === "danger" ? colors.danger : colors.primary} size="small" /> : <ChevronRight color={tone === "danger" ? colors.danger : colors.textMuted} size={18} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  modalRoot: { backgroundColor: "rgba(11,31,58,0.44)", flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.md },
  handle: { alignSelf: "center", backgroundColor: colors.borderStrong, borderRadius: radii.pill, height: 4, width: 34 },
  heading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  headingCopy: { flex: 1 },
  amount: { color: colors.textStrong, fontSize: 20, fontWeight: "900" },
  detail: { color: colors.textMuted, fontSize: typography.caption, lineHeight: 18, marginTop: 3 },
  label: { color: colors.textSubtle, fontSize: typography.micro, fontWeight: "900", letterSpacing: 0.7 },
  actionList: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: "hidden" },
  actionRow: { alignItems: "center", backgroundColor: colors.surface, flexDirection: "row", gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md },
  actionRowDanger: { backgroundColor: "#FFF8F7" },
  actionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.md, height: 36, justifyContent: "center", width: 36 },
  actionIconDanger: { backgroundColor: colors.dangerSoft },
  actionIconSuccess: { backgroundColor: colors.successSoft },
  actionLabel: { color: colors.textStrong, flex: 1, fontSize: typography.body, fontWeight: "800" },
  actionLabelDanger: { color: colors.danger },
  closeButton: { alignItems: "center", minHeight: 44, justifyContent: "center" },
  closeLabel: { color: colors.textMuted, fontSize: typography.caption, fontWeight: "800" },
  pressed: { opacity: 0.68 },
  viewerRoot: { backgroundColor: "#0B1F3A", flex: 1 },
  viewerHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 56, paddingHorizontal: spacing.lg },
  viewerTitle: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "900" },
  viewerClose: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 44, paddingHorizontal: 4 },
  viewerCloseText: { color: "#FFFFFF", fontSize: typography.caption, fontWeight: "800" },
  viewerImageWrap: { alignItems: "center", flex: 1, justifyContent: "center", padding: spacing.md },
  viewerImage: { height: "100%", maxHeight: 620, width: "100%" },
});
