import type { ComponentType, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Search, X, ArrowLeft } from "lucide-react-native";

import { Input, InputField, InputSlot } from "./ui/input";
import { Button, ButtonIcon, ButtonSpinner } from "./ui/button";
import { colors, layout, radii, spacing, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { money } from "../lib/format";

type MobileIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

export function SearchField({ value, onChangeText, placeholder = "Cari...", onClear }: { value: string; onChangeText: (value: string) => void; placeholder?: string; onClear?: () => void }) {
  return <Input accessibilityLabel={placeholder} className="min-h-12 w-full rounded-xl border-[#DFE4EC] bg-white px-2 shadow-sm"><InputSlot className="min-h-11 min-w-9"><Search color={colors.textMuted} size={17} strokeWidth={2.2} /></InputSlot><InputField value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSubtle} className="border-0 bg-transparent px-1 text-sm text-[#0F234D]" />{value && onClear ? <InputSlot accessibilityRole="button" accessibilityLabel="Hapus pencarian" onPress={onClear} className="min-h-11 min-w-9"><X color={colors.textMuted} size={16} /></InputSlot> : null}</Input>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <View style={styles.filterBar}>{children}</View>;
}

export function DropdownEdge({ children, onPress, accessibilityLabel }: { children: ReactNode; onPress?: () => void; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}><View style={styles.dropdownCopy}>{children}</View><ChevronDown color={colors.textMuted} size={18} strokeWidth={2.2} /></Pressable>;
}

export function SheetSurface({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

export function IconButton({ icon: Icon, accessibilityLabel, onPress, disabled = false, loading = false, variant = "plain" }: { icon: MobileIcon; accessibilityLabel: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: "plain" | "surface" | "danger" | "inverse" }) {
  const buttonVariant = variant === "danger" ? "outline" : variant === "inverse" ? "ghost" : "ghost";
  const tint = variant === "danger" ? colors.danger : variant === "inverse" ? colors.surface : colors.textStrong;
  return <Button accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ busy: loading, disabled }} disabled={disabled || loading} onPress={onPress} variant={buttonVariant} size="icon" className={`${variant === "surface" ? "border border-[#DFE4EC] bg-[#F1F5F9]" : ""} ${variant === "danger" ? "border-[#F1B7B3] bg-[#FDECEC]" : ""} ${variant === "inverse" ? "bg-[#FFFFFF18]" : ""} min-h-11 min-w-11 rounded-full ${(disabled || loading) ? "opacity-50" : ""}`}>
    {loading ? <ButtonSpinner color={tint} /> : <ButtonIcon as={Icon} color={tint} height={19} width={19} />}
  </Button>;
}

export function SheetHeader({ title, icon: Icon, onClose, closeLabel = "Tutup" }: { title: string; icon?: MobileIcon; onClose: () => void; closeLabel?: string }) {
  return <View style={styles.sheetHeader}><View style={styles.sheetTitleRow}>{Icon ? <View style={styles.sheetTitleIcon}><Icon color={colors.primary} size={18} strokeWidth={2.2} /></View> : null}<Text numberOfLines={2} style={styles.sheetTitle}>{title}</Text></View><IconButton icon={X} accessibilityLabel={closeLabel} onPress={onClose} /></View>;
}

export function MoneyText({ value, style }: { value: number | string | null | undefined; style?: object }) {
  return <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.money, style]}>{money(value)}</Text>;
}

export function SafeBottomAction({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.safeAction, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>{children}</View>;
}

export function BackLink({ label = "Kembali", onPress }: { label?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><ArrowLeft color={colors.primary} size={18} strokeWidth={2.2} /><Text style={styles.backLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  dropdown: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: spacing.md },
  dropdownCopy: { flex: 1, minWidth: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, minHeight: 280, padding: spacing.lg, paddingBottom: spacing.xxl },
  back: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 44, paddingVertical: 4 },
  backLabel: { color: colors.primary, fontSize: typography.caption, fontWeight: "800" },
  iconButton: { alignItems: "center", borderRadius: radii.pill, height: layout.minTouchTarget, justifyContent: "center", width: layout.minTouchTarget },
  iconButtonSurface: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1 },
  iconButtonDanger: { backgroundColor: colors.dangerSoft, borderColor: "#F1B7B3", borderWidth: 1 },
  iconButtonInverse: { backgroundColor: "#FFFFFF18" },
  sheetHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", minHeight: 44 },
  sheetTitleRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 0 },
  sheetTitleIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.md, height: 34, justifyContent: "center", width: 34 },
  sheetTitle: { color: colors.textStrong, flex: 1, fontSize: typography.section, fontWeight: "900" },
  money: { color: colors.textStrong, fontSize: typography.body, fontWeight: "900" },
  safeAction: { paddingBottom: spacing.sm },
  filterBar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
});
