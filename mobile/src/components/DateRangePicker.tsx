import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDate, isValidDate, type DateRange } from "../date-range";
import { useDateRange } from "../date-range-provider";
import { colors, radii, spacing } from "../theme";
import { CalendarSheet } from "./CalendarPicker";

export function DateRangePicker() {
  const { range, setRange } = useDateRange();
  const [draft, setDraft] = useState<DateRange>(range);
  const [active, setActive] = useState<"from" | "to" | null>(null);

  function changeDate(key: "from" | "to", value: string) {
    const next = { ...draft, [key === "from" ? "dateFrom" : "dateTo"]: value };
    setDraft(next);
    if (isValidDate(next.dateFrom) && isValidDate(next.dateTo) && next.dateFrom <= next.dateTo) setRange(next);
  }

  function setCurrentMonth() {
    const now = new Date();
    const next = { dateFrom: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    setDraft(next);
    setRange(next);
  }

  return <>
    <View style={styles.bar}>
      <View style={styles.labelRow}><View style={styles.iconBubble}><CalendarDays color={colors.primary} size={15} /></View><View><Text style={styles.label}>DATE RANGE</Text><Text style={styles.value}>{range.dateFrom} — {range.dateTo}</Text></View></View>
      <View style={styles.actions}><Pressable accessibilityLabel="Choose start date" accessibilityRole="button" onPress={() => { setDraft(range); setActive("from"); }} style={styles.dateButton}><Text style={styles.dateButtonText}>Dari</Text></Pressable><Pressable accessibilityLabel="Choose end date" accessibilityRole="button" onPress={() => { setDraft(range); setActive("to"); }} style={styles.dateButton}><Text style={styles.dateButtonText}>Sampai</Text></Pressable><Pressable accessibilityLabel="Use current month" accessibilityRole="button" onPress={setCurrentMonth} style={styles.monthButton}><Text style={styles.monthButtonText}>Bulan ini</Text><ChevronDown color={colors.primary} size={14} /></Pressable></View>
    </View>
    <CalendarSheet key={`${active}-${draft.dateFrom}-${draft.dateTo}`} open={active !== null} onClose={() => setActive(null)} value={active === "from" ? draft.dateFrom : draft.dateTo} onChange={(value) => { if (active) changeDate(active, value); }} title={active === "from" ? "Tanggal mulai filter" : "Tanggal akhir filter"} />
  </>;
}

const styles = StyleSheet.create({ bar: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: spacing.sm, paddingHorizontal: 11, paddingVertical: 9 }, labelRow: { alignItems: "center", flexDirection: "row", gap: 8 }, iconBubble: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 9, height: 30, justifyContent: "center", width: 30 }, label: { color: colors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 }, value: { color: colors.textStrong, fontSize: 11, fontWeight: "800", marginTop: 2 }, actions: { alignItems: "center", flexDirection: "row", gap: 6 }, dateButton: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingHorizontal: 9, paddingVertical: 7 }, dateButtonText: { color: colors.textStrong, fontSize: 10, fontWeight: "800" }, monthButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.md, flexDirection: "row", gap: 3, marginLeft: "auto", paddingHorizontal: 9, paddingVertical: 7 }, monthButtonText: { color: colors.primary, fontSize: 10, fontWeight: "900" } });
