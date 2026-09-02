import { forwardRef } from "react";
import { useState } from "react";
import { CalendarDays } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, type NativeSyntheticEvent, type TextInputFocusEventData, type TextInputProps } from "react-native";

import { Input, InputField } from "./input";
import { Button, ButtonText } from "./button";
import { CalendarSheet } from "../CalendarPicker";
import { formatMoneyInput, parseMoneyInput } from "../../lib/format";
import { colors } from "../../theme";

type AppTextInputProps = TextInputProps & { currency?: boolean };

export const TextInput = forwardRef<React.ElementRef<typeof InputField>, AppTextInputProps>(function GluestackTextInput({ style, currency, ...props }, ref) {
  if (props.placeholder?.includes("YYYY-MM-DD")) return <CalendarTextInput {...props} style={style} />;
  if (currency) return <CurrencyTextInput {...props} style={style} ref={ref} />;
  return <Input style={[{ backgroundColor: colors.surface, borderColor: colors.border }, style]} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField ref={ref} {...props} className={props.multiline ? "min-h-24 py-3" : "py-3"} /></Input>;
});

TextInput.displayName = "TextInput";

function CalendarTextInput({ style, ...props }: TextInputProps) {
  const [open, setOpen] = useState(false);
  const value = String(props.value ?? "");
  return <View><Button accessibilityLabel={props.accessibilityLabel ?? props.placeholder ?? "Pilih tanggal"} accessibilityRole="button" onPress={() => setOpen(true)} variant="outline" className="min-h-12 w-full justify-start rounded-xl border-[#DFE4EC] bg-white px-3" style={style}><CalendarDays color={value ? colors.primary : colors.textSubtle} size={17} /><ButtonText className={value ? "ml-2 text-sm font-semibold text-[#0F234D]" : "ml-2 text-sm font-normal text-[#8A96A8]"}>{value || props.placeholder || "Pilih tanggal"}</ButtonText></Button><CalendarSheet key={`${value}-${open}`} open={open} onClose={() => setOpen(false)} value={value} onChange={(next) => props.onChangeText?.(next)} title={props.placeholder?.replace(" YYYY-MM-DD", "") || "Pilih tanggal"} /></View>;
}

const CurrencyTextInput = forwardRef<React.ElementRef<typeof InputField>, TextInputProps>(function CurrencyTextInput({ style, value, onChangeText, onFocus, onBlur, ...props }, ref) {
  return <Input style={[{ backgroundColor: colors.surface, borderColor: colors.border }, style]} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField ref={ref} {...props} keyboardType={props.keyboardType ?? "numeric"} value={formatMoneyInput(value as string | number | null | undefined)} onChangeText={(next) => onChangeText?.(parseMoneyInput(next))} onFocus={onFocus} onBlur={onBlur} className={props.multiline ? "min-h-24 py-3" : "py-3"} /></Input>;
});

const styles = StyleSheet.create({ input: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 12 }, text: { color: colors.textStrong, flex: 1, fontSize: 12 }, placeholder: { color: colors.textSubtle } });
