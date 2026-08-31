import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { isValidCalendarDate } from "../date-validation";
import { colors, radii, spacing } from "../theme";
import { Button, ButtonText } from "./ui/button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "./ui/modal";

type CalendarMode = "date" | "month";

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function pad(value: number) { return String(value).padStart(2, "0"); }

function parseValue(value: string, mode: CalendarMode) {
  const match = mode === "date" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, mode === "date" ? Number(match[3]) : 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateValue(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function monthValue(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`; }

export function CalendarSheet({ open, onClose, value, onChange, title, mode = "date" }: { open: boolean; onClose: () => void; value: string; onChange: (value: string) => void; title: string; mode?: CalendarMode }) {
  const [draft, setDraft] = useState(value || (mode === "date" ? dateValue(new Date()) : monthValue(new Date())));
  const [visible, setVisible] = useState(() => parseValue(value, mode));
  const [error, setError] = useState("");

  const days = useMemo(() => {
    if (mode !== "date") return [];
    const firstDay = new Date(visible.getFullYear(), visible.getMonth(), 1).getDay();
    const totalDays = new Date(visible.getFullYear(), visible.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
  }, [mode, visible]);

  function chooseDay(day: number) {
    const next = dateValue(new Date(visible.getFullYear(), visible.getMonth(), day));
    setDraft(next);
    setError("");
  }

  function chooseMonth(month: number) {
    setDraft(`${visible.getFullYear()}-${pad(month + 1)}`);
    setError("");
  }

  function apply() {
    if (mode === "date" && !isValidCalendarDate(draft)) {
      setError("Pilih tanggal kalender yang valid.");
      return;
    }
    if (mode === "month" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft)) {
      setError("Pilih periode bulan yang valid.");
      return;
    }
    onChange(draft);
    onClose();
  }

  function moveMonth(offset: number) {
    setVisible((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function moveYear(offset: number) {
    setVisible((current) => new Date(current.getFullYear() + offset, current.getMonth(), 1));
  }

  const selectedDate = mode === "date" ? parseValue(draft, "date") : null;
  const selectedMonth = mode === "month" ? parseValue(draft, "month") : null;

  return <Modal isOpen={open} onClose={onClose} size="full">
    <ModalBackdrop />
    <ModalContent className="mt-auto w-full rounded-t-3xl rounded-b-none p-5 pb-safe">
      <ModalHeader><View style={styles.headerRow}><View style={styles.titleRow}><View style={styles.titleIcon}><CalendarDays color={colors.primary} size={18} /></View><Text style={styles.title}>{title}</Text></View><Pressable accessibilityLabel="Tutup kalender" accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.closeButton}><X color={colors.textStrong} size={20} /></Pressable></View></ModalHeader>
      <ModalBody>
        <View style={styles.calendarHeader}><Pressable accessibilityLabel="Bulan sebelumnya" accessibilityRole="button" hitSlop={8} onPress={() => mode === "date" ? moveMonth(-1) : moveYear(-1)} style={styles.navButton}><ChevronLeft color={colors.textStrong} size={18} /></Pressable><Text style={styles.monthTitle}>{mode === "date" ? `${monthNames[visible.getMonth()]} ${visible.getFullYear()}` : String(visible.getFullYear())}</Text><Pressable accessibilityLabel="Bulan berikutnya" accessibilityRole="button" hitSlop={8} onPress={() => mode === "date" ? moveMonth(1) : moveYear(1)} style={styles.navButton}><ChevronRight color={colors.textStrong} size={18} /></Pressable></View>
        {mode === "date" ? <><View style={styles.weekdays}>{weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View><View style={styles.grid}>{days.map((day, index) => day ? <Pressable accessibilityLabel={`${day} ${monthNames[visible.getMonth()]} ${visible.getFullYear()}`} accessibilityRole="button" key={`${day}-${index}`} onPress={() => chooseDay(day)} style={styles.dayCell}><View style={[styles.dayCircle, selectedDate && selectedDate.getFullYear() === visible.getFullYear() && selectedDate.getMonth() === visible.getMonth() && selectedDate.getDate() === day && styles.selectedCircle]}><Text style={[styles.dayText, selectedDate && selectedDate.getFullYear() === visible.getFullYear() && selectedDate.getMonth() === visible.getMonth() && selectedDate.getDate() === day && styles.selectedText]}>{day}</Text></View></Pressable> : <View key={`empty-${index}`} style={styles.dayCell} />)}</View></> : <View style={styles.monthGrid}>{monthNames.map((month, index) => <Pressable accessibilityLabel={`${month} ${visible.getFullYear()}`} accessibilityRole="button" key={month} onPress={() => chooseMonth(index)} style={[styles.monthCell, selectedMonth && selectedMonth.getFullYear() === visible.getFullYear() && selectedMonth.getMonth() === index && styles.selectedMonth]}><Text style={[styles.monthText, selectedMonth && selectedMonth.getFullYear() === visible.getFullYear() && selectedMonth.getMonth() === index && styles.selectedText]}>{month.slice(0, 3)}</Text></Pressable>)}</View>}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ModalBody>
      <ModalFooter><Button onPress={onClose} variant="outline" className="min-h-11 rounded-xl border-[#DFE4EC]"><ButtonText className="text-[#0F234D]">Batal</ButtonText></Button><Button onPress={apply} className="min-h-11 rounded-xl bg-[#1454C4]"><ButtonText>Gunakan</ButtonText></Button></ModalFooter>
    </ModalContent>
  </Modal>;
}

const styles = StyleSheet.create({ headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, titleRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm }, closeButton: { alignItems: "center", borderRadius: radii.pill, height: 40, justifyContent: "center", width: 40 }, titleIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.md, height: 34, justifyContent: "center", width: 34 }, title: { color: colors.textStrong, flexShrink: 1, fontSize: 18, fontWeight: "900" }, calendarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md }, navButton: { alignItems: "center", backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, height: 36, justifyContent: "center", width: 36 }, monthTitle: { color: colors.textStrong, fontSize: 15, fontWeight: "900" }, weekdays: { flexDirection: "row", marginBottom: 4 }, weekday: { color: colors.textMuted, flex: 1, fontSize: 10, fontWeight: "800", textAlign: "center" }, grid: { flexDirection: "row", flexWrap: "wrap" }, dayCell: { alignItems: "center", height: 44, justifyContent: "center", width: `${100 / 7}%` }, dayCircle: { alignItems: "center", borderRadius: radii.pill, height: 34, justifyContent: "center", width: 34 }, selectedCircle: { backgroundColor: colors.primary }, dayText: { color: colors.textStrong, fontSize: 12, fontWeight: "700" }, selectedText: { color: "#FFFFFF", fontWeight: "900" }, monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, monthCell: { alignItems: "center", borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, height: 44, justifyContent: "center", width: "23%" }, selectedMonth: { backgroundColor: colors.primary, borderColor: colors.primary }, monthText: { color: colors.textStrong, fontSize: 11, fontWeight: "800" }, error: { color: colors.danger, fontSize: 11, marginTop: spacing.sm } });
