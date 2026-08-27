import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDate, isValidDate, type DateRange } from "../date-range";
import { useDateRange } from "../date-range-provider";
import { colors, spacing } from "../theme";
import { Button, ButtonText } from "./ui/button";
import { Input, InputField } from "./ui/input";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "./ui/modal";

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
    <Modal isOpen={open} onClose={() => setOpen(false)} size="full">
      <ModalBackdrop />
      <ModalContent className="mt-auto min-h-[320px] w-full rounded-t-3xl rounded-b-none p-5 pb-safe">
        <ModalHeader><Text className="text-lg font-black text-[#0F234D]">Filter date range</Text></ModalHeader>
        <ModalBody>
          <Text className="mb-3 text-xs text-[#6E7785]">All dated lists and summaries use this range.</Text>
          <Text className="mb-1 text-xs font-extrabold text-[#0F234D]">From</Text>
          <Input className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField autoFocus keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={draft.dateFrom} className="py-3" /></Input>
          <Text className="mb-1 mt-3 text-xs font-extrabold text-[#0F234D]">To</Text>
          <Input className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(value) => setDraft((current) => ({ ...current, dateTo: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={draft.dateTo} className="py-3" /></Input>
          {draft.dateFrom > draft.dateTo || !isValidDate(draft.dateFrom) || !isValidDate(draft.dateTo) ? <Text className="mt-2 text-xs text-[#C5312C]">Use valid dates with From before To.</Text> : null}
          <Button onPress={setCurrentMonth} variant="outline" className="mt-3 min-h-11 rounded-xl border-[#1454C4]"><ButtonText className="text-[#1454C4]">Use current month</ButtonText></Button>
        </ModalBody>
        <ModalFooter><Button onPress={() => setOpen(false)} variant="outline" className="min-h-11 rounded-xl border-[#DFE4EC]"><ButtonText className="text-[#0F234D]">Cancel</ButtonText></Button><Button onPress={apply} className="min-h-11 rounded-xl bg-[#1454C4]"><ButtonText>Apply range</ButtonText></Button></ModalFooter>
      </ModalContent>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ bar: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 11, paddingVertical: 9 }, labelRow: { alignItems: "center", flexDirection: "row", gap: 8 }, iconBubble: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 9, height: 30, justifyContent: "center", width: 30 }, label: { color: colors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 }, value: { color: colors.textStrong, fontSize: 11, fontWeight: "800", marginTop: 2 }, backdrop: { backgroundColor: "#00000066", flex: 1, justifyContent: "flex-end" }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: spacing.sm, padding: spacing.lg }, title: { color: colors.text, fontSize: 18, fontWeight: "900" }, hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, fieldLabel: { color: colors.text, fontSize: 11, fontWeight: "800", marginTop: spacing.xs }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 44, paddingHorizontal: 12 }, error: { color: colors.danger, fontSize: 10 }, quick: { alignItems: "center", borderColor: colors.primary, borderRadius: 9, borderWidth: 1, padding: 11 }, quickText: { color: colors.primary, fontSize: 11, fontWeight: "800" }, actions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.sm }, cancel: { borderColor: colors.border, borderRadius: 9, borderWidth: 1, padding: spacing.md }, cancelText: { color: colors.text, fontWeight: "800" }, apply: { backgroundColor: colors.primary, borderRadius: 9, padding: spacing.md }, applyText: { color: "#FFFFFF", fontWeight: "800" } });
