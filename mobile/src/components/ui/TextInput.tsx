import { forwardRef } from "react";
import { useState } from "react";
import { CalendarDays } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, type TextInputProps } from "react-native";

import { Input, InputField } from "./input";
import { CalendarSheet } from "../CalendarPicker";

export const TextInput = forwardRef<React.ElementRef<typeof InputField>, TextInputProps>(function GluestackTextInput({ style, ...props }, ref) {
  if (props.placeholder?.includes("YYYY-MM-DD")) return <CalendarTextInput {...props} style={style} />;
  return <Input style={style} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField ref={ref} {...props} className={props.multiline ? "min-h-28 py-3" : "py-3"} /></Input>;
});

TextInput.displayName = "TextInput";

function CalendarTextInput({ style, ...props }: TextInputProps) {
  const [open, setOpen] = useState(false);
  const value = String(props.value ?? "");
  return <View><Pressable accessibilityLabel={props.accessibilityLabel ?? props.placeholder ?? "Choose date"} accessibilityRole="button" onPress={() => setOpen(true)} style={[styles.input, style]}><CalendarDays color={value ? "#1454C4" : "#8A96A8"} size={17} /><Text numberOfLines={1} style={[styles.text, !value && styles.placeholder]}>{value || props.placeholder || "Pilih tanggal"}</Text></Pressable><CalendarSheet key={`${value}-${open}`} open={open} onClose={() => setOpen(false)} value={value} onChange={(next) => props.onChangeText?.(next)} title={props.placeholder?.replace(" YYYY-MM-DD", "") || "Pilih tanggal"} /></View>;
}

const styles = StyleSheet.create({ input: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DFE4EC", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 12 }, text: { color: "#0F234D", flex: 1, fontSize: 12 }, placeholder: { color: "#8A96A8" } });
