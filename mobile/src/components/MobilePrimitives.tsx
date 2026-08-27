import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Search, X, ArrowLeft } from "lucide-react-native";

import { Input, InputField, InputSlot } from "./ui/input";
import { colors, radii, spacing, typography } from "../theme";

export function SearchField({ value, onChangeText, placeholder = "Cari...", onClear }: { value: string; onChangeText: (value: string) => void; placeholder?: string; onClear?: () => void }) {
  return <Input accessibilityLabel={placeholder} className="min-h-12 w-full rounded-xl border-[#DFE4EC] bg-white px-2 shadow-sm"><InputSlot className="min-h-11 min-w-9"><Search color={colors.textMuted} size={17} strokeWidth={2.2} /></InputSlot><InputField value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSubtle} className="border-0 bg-transparent px-1 text-sm text-[#0F234D]" />{value && onClear ? <InputSlot accessibilityRole="button" accessibilityLabel="Hapus pencarian" onPress={onClear} className="min-h-11 min-w-9"><X color={colors.textMuted} size={16} /></InputSlot> : null}</Input>;
}

export function DropdownEdge({ children, onPress, accessibilityLabel }: { children: ReactNode; onPress?: () => void; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}><View style={styles.dropdownCopy}>{children}</View><ChevronDown color={colors.textMuted} size={18} strokeWidth={2.2} /></Pressable>;
}

export function SheetSurface({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

export function BackLink({ label = "Kembali", onPress }: { label?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><ArrowLeft color={colors.primary} size={18} strokeWidth={2.2} /><Text style={styles.backLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  dropdown: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: spacing.md },
  dropdownCopy: { flex: 1, minWidth: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, minHeight: 320, padding: spacing.lg, paddingBottom: spacing.xxl },
  back: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 44, paddingVertical: 4 },
  backLabel: { color: colors.primary, fontSize: typography.caption, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
