import { ChevronDown, ChevronRight, Info, ShieldAlert } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState, type ReactNode } from "react";

import { describeError } from "../lib/feedback";
import { colors, radii, spacing, typography } from "../theme";

export type StatusTone = "success" | "danger" | "warning" | "info" | "muted";
export type ModuleItem = { label: string; description: string; onPress: () => void; icon?: ReactNode };

const toneStyles: Record<StatusTone, { backgroundColor: string; borderColor: string; color: string }> = {
  success: { backgroundColor: colors.successSoft, borderColor: "#C5E8D1", color: colors.success },
  danger: { backgroundColor: colors.dangerSoft, borderColor: "#F1B7B3", color: colors.danger },
  warning: { backgroundColor: colors.warningSoft, borderColor: "#F1D99E", color: colors.warning },
  info: { backgroundColor: colors.infoSoft, borderColor: "#C9D9F8", color: colors.primary },
  muted: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.textMuted },
};

export function StatusChip({ label, tone = "muted" }: { label: string; tone?: StatusTone }) {
  const palette = toneStyles[tone];
  return <View accessibilityLabel={`Status: ${label}`} style={[styles.statusChip, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}><Text style={[styles.statusText, { color: palette.color }]}>{label}</Text></View>;
}

export function CompactRow({ title, meta, status, statusTone = "muted", icon, onPress, action }: { title: string; meta?: string; status?: string; statusTone?: StatusTone; icon?: ReactNode; onPress?: () => void; action?: ReactNode }) {
  const content = <><View style={styles.rowIcon}>{icon ?? <Info color={colors.primary} size={18} />}</View><View style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>{meta ? <Text numberOfLines={1} style={styles.rowMeta}>{meta}</Text> : null}</View>{status ? <StatusChip label={status} tone={statusTone} /> : null}{action ?? (onPress ? <ChevronRight color={colors.textMuted} size={18} /> : null)}</>;
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string; hint?: string; tone?: StatusTone; onPress?: () => void }> }) {
  return <View style={styles.metricStrip}>{items.map((item) => { const tone = toneStyles[item.tone ?? "info"]; const content = <><Text style={styles.metricLabel}>{item.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{item.value}</Text>{item.hint ? <Text numberOfLines={1} style={styles.metricHint}>{item.hint}</Text> : null}</>; return item.onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.value}`} key={item.label} onPress={item.onPress} style={({ pressed }) => [styles.metric, { borderLeftColor: tone.color }, pressed && styles.pressed]}>{content}</Pressable> : <View key={item.label} style={[styles.metric, { borderLeftColor: tone.color }]}>{content}</View>; })}</View>;
}

export function ModuleHub({ title, description, items }: { title: string; description?: string; items: ModuleItem[] }) {
  if (!items.length) return null;
  return <View style={styles.moduleGroup}><View style={styles.moduleHeader}><View style={styles.moduleHeaderCopy}><Text style={styles.moduleTitle}>{title}</Text>{description ? <Text style={styles.moduleDescription}>{description}</Text> : null}</View><Text style={styles.moduleCount}>{items.length} menu</Text></View><View style={styles.moduleList}>{items.map((item) => <Pressable accessibilityRole="button" accessibilityLabel={`Buka ${item.label}`} key={item.label} onPress={item.onPress} style={({ pressed }) => [styles.moduleItem, pressed && styles.pressed]}><View style={styles.moduleIcon}>{item.icon ?? <Info color={colors.primary} size={17} />}</View><View style={styles.moduleCopy}><Text style={styles.moduleItemTitle}>{item.label}</Text><Text numberOfLines={1} style={styles.moduleItemDescription}>{item.description}</Text></View><ChevronRight color={colors.textMuted} size={18} /></Pressable>)}</View></View>;
}

export function FormSection({ title, description, optional = true, defaultOpen = false, children }: { title: string; description?: string; optional?: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!optional) return <View style={styles.formSection}><Text style={styles.formTitle}>{title}</Text>{description ? <Text style={styles.formDescription}>{description}</Text> : null}{children}</View>;
  return <View style={styles.formSection}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={styles.formHeader}><View style={styles.formHeaderCopy}><Text style={styles.formTitle}>{title}</Text><Text style={styles.optional}>Opsional</Text>{description ? <Text style={styles.formDescription}>{description}</Text> : null}</View>{open ? <ChevronDown color={colors.textMuted} size={18} /> : <ChevronRight color={colors.textMuted} size={18} />}</Pressable>{open ? <View style={styles.formBody}>{children}</View> : null}</View>;
}

export function InlineErrorPanel({ error, fallback, onRetry }: { error?: unknown; fallback: string; onRetry?: () => void }) {
  const details = describeError(error, fallback);
  return <View accessibilityRole="alert" style={styles.errorPanel}><View style={styles.errorHeading}><ShieldAlert color={colors.danger} size={17} /><Text style={styles.errorTitle}>{details.title}</Text></View><Text style={styles.errorReason}>{details.reason}</Text><Text style={styles.errorNext}>{details.nextStep}</Text>{details.requestId ? <Text style={styles.errorDiagnostic}>ID dukungan: {details.requestId}{details.appRevision && details.appRevision !== "unknown" ? ` · Revisi ${details.appRevision}` : ""}</Text> : null}{onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Coba lagi</Text></Pressable> : null}</View>;
}

export function PermissionExplanation({ title = "Akses terbatas", message = "Fitur ini tidak tersedia untuk peran akun Anda." }: { title?: string; message?: string }) {
  return <View style={styles.permission}><ShieldAlert color={colors.warning} size={18} /><View style={styles.permissionCopy}><Text style={styles.permissionTitle}>{title}</Text><Text style={styles.permissionMessage}>{message}</Text></View></View>;
}

export function ApprovalBar({ label, onApprove, onReject, disabled = false }: { label?: string; onApprove?: () => void; onReject?: () => void; disabled?: boolean }) {
  return <View style={styles.approvalBar}>{label ? <Text style={styles.approvalLabel}>{label}</Text> : null}<View style={styles.approvalActions}>{onReject ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onReject} style={[styles.rejectButton, disabled && styles.disabled]}><Text style={styles.rejectText}>Tolak</Text></Pressable> : null}{onApprove ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onApprove} style={[styles.approveButton, disabled && styles.disabled]}><Text style={styles.approveText}>Setujui</Text></Pressable> : null}</View></View>;
}

export function EvidenceGallery({ title = "Bukti", children }: { title?: string; children: ReactNode }) {
  return <View style={styles.evidence}><Text style={styles.formTitle}>{title}</Text><View style={styles.evidenceBody}>{children}</View></View>;
}

const styles = StyleSheet.create({
  statusChip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: "900" },
  row: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  rowIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.sm, height: 36, justifyContent: "center", width: 36 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.textStrong, fontSize: typography.body, fontWeight: "800" },
  rowMeta: { color: colors.textMuted, fontSize: typography.caption, marginTop: 3 },
  metricStrip: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderLeftWidth: 3, borderRadius: radii.md, borderWidth: 1, flexGrow: 1, minHeight: 76, minWidth: "46%", padding: spacing.sm },
  metricLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  metricValue: { color: colors.textStrong, fontSize: 17, fontWeight: "900", marginTop: 4 },
  metricHint: { color: colors.textSubtle, fontSize: 10, marginTop: 2 },
  moduleGroup: { gap: spacing.xs },
  moduleHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  moduleHeaderCopy: { flex: 1 },
  moduleTitle: { color: colors.textStrong, fontSize: 15, fontWeight: "900" },
  moduleDescription: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  moduleCount: { color: colors.textSubtle, fontSize: 10, fontWeight: "800" },
  moduleList: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, overflow: "hidden" },
  moduleItem: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  moduleIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.sm, height: 34, justifyContent: "center", width: 34 },
  moduleCopy: { flex: 1, minWidth: 0 },
  moduleItemTitle: { color: colors.textStrong, fontSize: typography.body, fontWeight: "800" },
  moduleItemDescription: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  formSection: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, padding: spacing.sm },
  formHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 44 },
  formHeaderCopy: { flex: 1 },
  formTitle: { color: colors.textStrong, fontSize: typography.body, fontWeight: "900" },
  optional: { color: colors.textSubtle, fontSize: 10, fontWeight: "800", marginTop: 2 },
  formDescription: { color: colors.textMuted, fontSize: typography.caption, lineHeight: 16, marginTop: 3 },
  formBody: { gap: spacing.sm, paddingTop: spacing.sm },
  errorPanel: { backgroundColor: colors.dangerSoft, borderColor: "#F1B7B3", borderRadius: radii.md, borderWidth: 1, gap: 5, padding: spacing.sm },
  errorHeading: { alignItems: "center", flexDirection: "row", gap: 6 },
  errorTitle: { color: colors.danger, fontSize: typography.caption, fontWeight: "900" },
  errorReason: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "700" },
  errorNext: { color: colors.textMuted, fontSize: typography.caption },
  errorDiagnostic: { color: colors.textSubtle, fontSize: 10 },
  retry: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingHorizontal: 4 },
  retryText: { color: colors.primary, fontSize: typography.caption, fontWeight: "900" },
  permission: { alignItems: "flex-start", backgroundColor: colors.warningSoft, borderColor: "#F1D99E", borderRadius: radii.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm },
  permissionCopy: { flex: 1 },
  permissionTitle: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "900" },
  permissionMessage: { color: colors.textMuted, fontSize: typography.caption, lineHeight: 16, marginTop: 2 },
  approvalBar: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, padding: spacing.sm },
  approvalLabel: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "800" },
  approvalActions: { flexDirection: "row", gap: spacing.sm },
  rejectButton: { alignItems: "center", borderColor: colors.danger, borderRadius: radii.sm, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44 },
  approveButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radii.sm, flex: 1, justifyContent: "center", minHeight: 44 },
  rejectText: { color: colors.danger, fontSize: typography.caption, fontWeight: "900" },
  approveText: { color: "#FFFFFF", fontSize: typography.caption, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  evidence: { gap: spacing.sm },
  evidenceBody: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pressed: { opacity: 0.72 },
});
