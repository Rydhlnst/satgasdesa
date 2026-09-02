import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDate, isValidDate, type DateRange } from "../date-range";
import { useDateRange } from "../date-range-provider";
import { colors, radii, spacing } from "../theme";
import { CalendarSheet } from "./CalendarPicker";

export function DateRangePicker() {
  const { range, setRange } = useDateRange();
  const [draft, setDraft] = useState<DateRange>(range);
  const [active, setActive] = useState<"from" | "to" | null>(null);
  const [expanded, setExpanded] = useState(false);

  function changeDate(key: "from" | "to", value: string) {
    const next = { ...draft, [key === "from" ? "dateFrom" : "dateTo"]: value };
    if (key === "from" && value > next.dateTo) next.dateTo = value;
    if (key === "to" && value < next.dateFrom) next.dateFrom = value;
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
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Tutup filter rentang tanggal" : "Atur rentang tanggal"} onPress={() => setExpanded((value) => !value)} style={styles.summaryButton}><View style={styles.labelRow}><View style={styles.iconBubble}><CalendarDays color={colors.primary} size={15} /></View><View style={styles.copy}><Text style={styles.label}>RENTANG TANGGAL</Text><Text numberOfLines={1} style={styles.value}>{range.dateFrom} — {range.dateTo}</Text></View></View><ChevronDown color={colors.textMuted} size={17} style={expanded ? styles.chevronExpanded : undefined} /></Pressable>
      {expanded ? <View style={styles.actions}><Pressable accessibilityLabel="Pilih tanggal mulai" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setDraft(range); setActive("from"); }} style={styles.dateButton}><Text style={styles.dateButtonText}>Dari</Text></Pressable><Pressable accessibilityLabel="Pilih tanggal akhir" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setDraft(range); setActive("to"); }} style={styles.dateButton}><Text style={styles.dateButtonText}>Sampai</Text></Pressable><Pressable accessibilityLabel="Gunakan bulan ini" accessibilityRole="button" onPress={() => { setCurrentMonth(); }} style={styles.monthButton}><Text style={styles.monthButtonText}>Bulan ini</Text></Pressable></View> : null}
    </View>
    <CalendarSheet key={`${active}-${draft.dateFrom}-${draft.dateTo}`} open={active !== null} onClose={() => setActive(null)} value={active === "from" ? draft.dateFrom : draft.dateTo} onChange={(value) => { if (active) changeDate(active, value); }} title={active === "from" ? "Tanggal mulai filter" : "Tanggal akhir filter"} />
  </>;
}

const styles = StyleSheet.create({ bar: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: spacing.sm, paddingHorizontal: 10, paddingVertical: 6 }, summaryButton: { alignItems: "center", flexDirection: "row", minHeight: 44 }, labelRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: 8, minWidth: 0 }, copy: { flex: 1, minWidth: 0 }, iconBubble: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 9, height: 30, justifyContent: "center", width: 30 }, label: { color: colors.textMuted, fontSize: 8, fontWeight: "900", letterSpacing: 0.4 }, value: { color: colors.textStrong, fontSize: 10, fontWeight: "800", marginTop: 2 }, chevronExpanded: { transform: [{ rotate: "180deg" }] }, actions: { alignItems: "center", flexDirection: "row", gap: 4, justifyContent: "flex-end", paddingBottom: 2 }, dateButton: { alignItems: "center", backgroundColor: colors.surfaceMuted, borderRadius: radii.md, justifyContent: "center", minHeight: 44, paddingHorizontal: 10 }, dateButtonText: { color: colors.textStrong, fontSize: 9, fontWeight: "800" }, monthButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.md, justifyContent: "center", minHeight: 44, paddingHorizontal: 10 }, monthButtonText: { color: colors.primary, fontSize: 9, fontWeight: "900" } });
