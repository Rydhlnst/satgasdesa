import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { formatDate, isValidDate, type DateRange } from "../date-range";
import { useDateRange } from "../date-range-provider";
import { colors, spacing } from "../theme";

export function DateRangePicker() {
  const { range, setRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(range);
  function openPicker() { setDraft(range); setOpen(true); }
  function apply() {
    if (!isValidDate(draft.dateFrom) || !isValidDate(draft.dateTo) || draft.dateFrom > draft.dateTo) return;
    setRange(draft); setOpen(false);
  }
  function setCurrentMonth() {
    const now = new Date();
    setDraft({ dateFrom: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) });
  }
  return <>
    <Pressable accessibilityLabel="Change date range" accessibilityRole="button" onPress={openPicker} style={styles.bar}>
      <View style={styles.labelRow}><View style={styles.iconBubble}><CalendarDays color={colors.primary} size={15} /></View><View><Text style={styles.label}>DATE RANGE</Text><Text style={styles.value}>{range.dateFrom} — {range.dateTo}</Text></View></View><ChevronDown color={colors.textMuted} size={17} />
    </Pressable>
    <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}><View style={styles.sheet}>
        <Text style={styles.title}>Filter date range</Text>
        <Text style={styles.hint}>All dated lists and summaries use this range.</Text>
        <Text style={styles.fieldLabel}>From</Text><TextInput autoFocus keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} value={draft.dateFrom} />
        <Text style={styles.fieldLabel}>To</Text><TextInput keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(value) => setDraft((current) => ({ ...current, dateTo: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} value={draft.dateTo} />
        {draft.dateFrom > draft.dateTo || !isValidDate(draft.dateFrom) || !isValidDate(draft.dateTo) ? <Text style={styles.error}>Use valid dates with From before To.</Text> : null}
        <Pressable onPress={setCurrentMonth} style={styles.quick}><Text style={styles.quickText}>Use current month</Text></Pressable>
        <View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable onPress={apply} style={styles.apply}><Text style={styles.applyText}>Apply range</Text></Pressable></View>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ bar: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 11, paddingVertical: 9 }, labelRow: { alignItems: "center", flexDirection: "row", gap: 8 }, iconBubble: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 9, height: 30, justifyContent: "center", width: 30 }, label: { color: colors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 }, value: { color: colors.textStrong, fontSize: 11, fontWeight: "800", marginTop: 2 }, backdrop: { backgroundColor: "#00000066", flex: 1, justifyContent: "flex-end" }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: spacing.sm, padding: spacing.lg }, title: { color: colors.text, fontSize: 18, fontWeight: "900" }, hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, fieldLabel: { color: colors.text, fontSize: 11, fontWeight: "800", marginTop: spacing.xs }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 44, paddingHorizontal: 12 }, error: { color: colors.danger, fontSize: 10 }, quick: { alignItems: "center", borderColor: colors.primary, borderRadius: 9, borderWidth: 1, padding: 11 }, quickText: { color: colors.primary, fontSize: 11, fontWeight: "800" }, actions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.sm }, cancel: { borderColor: colors.border, borderRadius: 9, borderWidth: 1, padding: spacing.md }, cancelText: { color: colors.text, fontWeight: "800" }, apply: { backgroundColor: colors.primary, borderRadius: 9, padding: spacing.md }, applyText: { color: "#FFFFFF", fontWeight: "800" } });
