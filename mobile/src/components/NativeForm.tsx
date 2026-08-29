import { useRef, useState } from "react";
import { Controller, useWatch, type Control, type FieldErrors, type FieldValues, type UseFormRegister } from "react-hook-form";
import { CalendarDays, ChevronDown, Crosshair, Eye, EyeOff, MapPin } from "lucide-react-native";
import { Keyboard, Pressable, StyleSheet, Text, View, type NativeSyntheticEvent, type TextInputFocusEventData } from "react-native";

import { Button, ButtonSpinner, ButtonText } from "./ui/button";
import { FormControl, FormControlError, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "./ui/form-control";
import { Input, InputField, InputSlot } from "./ui/input";
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from "./ui/select";
import { showActionError } from "../lib/feedback";
import { CalendarSheet } from "./CalendarPicker";
import { formatMoneyInput, parseMoneyInput } from "../lib/format";

type KeyboardType = "default" | "numeric" | "phone-pad" | "email-address";
export type SelectOption = { label: string; value: string };

function errorMessage(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return message ? String(message) : undefined;
  }
  return String(value);
}

function normalizedOptions(options: SelectOption[]): SelectOption[] {
  const seen = new Set<string>();
  return (options ?? []).reduce<SelectOption[]>((result, option) => {
    const value = String(option?.value ?? "");
    if (seen.has(value)) return result;
    seen.add(value);
    result.push({ label: String(option?.label ?? value), value });
    return result;
  }, []);
}

function FieldShell({ label, required, error, helper, children }: { label: string; required?: boolean; error?: unknown; helper?: string; children: React.ReactNode }) {
  const message = errorMessage(error);
  return <FormControl isInvalid={Boolean(message)} isRequired={required} className="gap-1">
    <FormControlLabel className="mb-0.5"><FormControlLabelText className="text-xs font-extrabold text-[#0F234D]">{label}</FormControlLabelText></FormControlLabel>
    {children}
    {message ? <FormControlError className="mt-1"><FormControlErrorText className="text-xs text-[#C5312C]">{message}</FormControlErrorText></FormControlError> : helper ? <FormControlHelper className="mt-1"><FormControlHelperText className="text-xs text-[#6E7785]">{helper}</FormControlHelperText></FormControlHelper> : null}
  </FormControl>;
}

type RHFInputProps<T extends FieldValues> = { name: string; label: string; register: UseFormRegister<T>; errors: FieldErrors<T>; multiline?: boolean; keyboardType?: KeyboardType; placeholder?: string; secureTextEntry?: boolean; required?: boolean; helper?: string; currency?: boolean; control?: Control<T> };

function RHFInputField<T extends FieldValues>(props: RHFInputProps<T>) {
  return props.control ? <ControlledRHFInputField {...props} control={props.control} /> : <UncontrolledRHFInputField {...props} />;
}

function UncontrolledRHFInputField<T extends FieldValues>({ name, label, register, errors, multiline = false, keyboardType = "default", placeholder, secureTextEntry = false, required = false, helper, currency = false }: RHFInputProps<T>) {
  const [visible, setVisible] = useState(false);
  const registered = register(name as never);
  const message = errorMessage(errors[name as keyof T]);
  return <FieldShell label={label} required={required} error={message} helper={helper}><Input isInvalid={Boolean(message)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField accessibilityLabel={label} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} keyboardType={keyboardType} multiline={multiline} numberOfLines={multiline ? 4 : 1} onBlur={registered.onBlur} onChangeText={(value) => void registered.onChange({ target: { name, value: currency ? parseMoneyInput(value) : value }, type: "change" })} placeholder={placeholder} placeholderTextColor="#8A96A8" ref={(node) => registered.ref(node)} secureTextEntry={secureTextEntry && !visible} className={multiline ? "min-h-28 py-3" : "py-3"} />{secureTextEntry ? <InputSlot accessibilityLabel={visible ? "Hide " + label : "Show " + label} accessibilityRole="button" onPress={() => setVisible((current) => !current)} className="min-h-11 min-w-10">{visible ? <EyeOff color="#6E7785" size={19} /> : <Eye color="#6E7785" size={19} />}</InputSlot> : null}</Input></FieldShell>;
}

function ControlledRHFInputField<T extends FieldValues>({ name, label, register, errors, multiline = false, keyboardType = "default", placeholder, secureTextEntry = false, required = false, helper, currency = false, control }: RHFInputProps<T> & { control: Control<T> }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const registered = register(name as never);
  const watchedValue = useWatch({ control, name: name as never });
  const message = errorMessage(errors[name as keyof T]);
  const displayValue = currency ? (focused ? String(watchedValue ?? "") : formatMoneyInput(watchedValue as unknown as string | number | null | undefined)) : String(watchedValue ?? "");
  return <FieldShell label={label} required={required} error={message} helper={helper}><Input isInvalid={Boolean(message)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField accessibilityLabel={label} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} keyboardType={keyboardType} multiline={multiline} numberOfLines={multiline ? 4 : 1} onBlur={(event: NativeSyntheticEvent<TextInputFocusEventData>) => { setFocused(false); registered.onBlur(event); }} onChangeText={(value) => void registered.onChange({ target: { name, value: currency ? parseMoneyInput(value) : value }, type: "change" })} onFocus={() => setFocused(true)} placeholder={placeholder} placeholderTextColor="#8A96A8" ref={(node) => registered.ref(node)} secureTextEntry={secureTextEntry && !visible} value={displayValue} className={multiline ? "min-h-28 py-3" : "py-3"} />{secureTextEntry ? <InputSlot accessibilityLabel={visible ? "Hide " + label : "Show " + label} accessibilityRole="button" onPress={() => setVisible((current) => !current)} className="min-h-11 min-w-10">{visible ? <EyeOff color="#6E7785" size={19} /> : <Eye color="#6E7785" size={19} />}</InputSlot> : null}</Input></FieldShell>;
}

export function TextInputField(props: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; error?: unknown; multiline?: boolean; keyboardType?: KeyboardType; placeholder?: string; required?: boolean; helper?: string; secureTextEntry?: boolean; currency?: boolean }) {
  if (props.placeholder?.includes("YYYY-MM")) return <MonthTextInput {...props} />;
  return <RegularTextInputField {...props} />;
}

function RegularTextInputField({ label, value, onChange, error, multiline = false, keyboardType = "default", placeholder, required = false, helper, secureTextEntry = false, currency = false }: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; error?: unknown; multiline?: boolean; keyboardType?: KeyboardType; placeholder?: string; required?: boolean; helper?: string; secureTextEntry?: boolean; currency?: boolean }) {
  const message = errorMessage(error);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const displayValue = currency && !focused ? formatMoneyInput(value) : String(value ?? "");
  return <FieldShell label={label} required={required} error={message} helper={helper}><Input isInvalid={Boolean(message)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField accessibilityLabel={label} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} keyboardType={keyboardType} multiline={multiline} numberOfLines={multiline ? 4 : 1} onBlur={() => setFocused(false)} onChangeText={(next) => onChange(currency ? parseMoneyInput(next) : next)} onFocus={() => setFocused(true)} placeholder={placeholder} placeholderTextColor="#8A96A8" value={displayValue} secureTextEntry={secureTextEntry && !visible} className={multiline ? "min-h-28 py-3" : "py-3"} />{secureTextEntry ? <InputSlot accessibilityLabel={visible ? "Hide " + label : "Show " + label} accessibilityRole="button" onPress={() => setVisible((current) => !current)} className="min-h-11 min-w-10">{visible ? <EyeOff color="#6E7785" size={19} /> : <Eye color="#6E7785" size={19} />}</InputSlot> : null}</Input></FieldShell>;
}

function MonthTextInput({ label, value, onChange, error, required = false, helper }: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; error?: unknown; required?: boolean; helper?: string }) {
  const [open, setOpen] = useState(false);
  const currentValue = String(value ?? "");
  return <FieldShell label={label} required={required} error={error} helper={helper}><Button accessibilityLabel={label} onPress={() => { Keyboard.dismiss(); setOpen(true); }} variant="outline" className="min-h-12 justify-start rounded-xl border-[#DFE4EC] bg-white px-3"><CalendarDays color={currentValue ? "#1454C4" : "#8A96A8"} size={18} /><ButtonText className={currentValue ? "ml-2 text-sm font-semibold text-[#0F234D]" : "ml-2 text-sm font-normal text-[#8A96A8]"}>{currentValue || "Pilih bulan"}</ButtonText></Button><CalendarSheet key={`${currentValue}-${open}`} mode="month" open={open} onClose={() => setOpen(false)} value={currentValue} onChange={onChange} title={label} /></FieldShell>;
}

export function DateField<T extends FieldValues>({ name, label, control, errors, required = false }: { name: string; label: string; control: Control<T>; errors: FieldErrors<T>; required?: boolean }) {
  const error = errors[name as keyof T];
  return <Controller control={control} name={name as never} render={({ field: { value, onChange } }) => <DatePicker value={String(value ?? "")} onChange={onChange} label={label} error={error} required={required} />} />;
}

export function DatePicker({ value, onChange, label, error, required = false }: { value: string; onChange: (value: string) => void; label: string; error?: unknown; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const message = errorMessage(error);
  return <FieldShell label={label} required={required} error={message}><Button accessibilityLabel={label} onPress={() => { Keyboard.dismiss(); setOpen(true); }} variant="outline" className="min-h-12 justify-start rounded-xl border-[#DFE4EC] bg-white px-3"><CalendarDays color={value ? "#1454C4" : "#8A96A8"} size={18} /><ButtonText className={value ? "ml-2 text-sm font-semibold text-[#0F234D]" : "ml-2 text-sm font-normal text-[#8A96A8]"}>{value || "Pilih tanggal"}</ButtonText></Button><CalendarSheet key={`${value}-${open}`} open={open} onClose={() => setOpen(false)} value={value} onChange={onChange} title={label} /></FieldShell>;
}

export function MonthField<T extends FieldValues>({ name, label, control, errors }: { name: string; label: string; control: Control<T>; errors: FieldErrors<T> }) {
  const error = errors[name as keyof T];
  return <Controller control={control} name={name as never} render={({ field: { value, onChange } }) => <MonthPicker value={String(value ?? "")} onChange={onChange} label={label} error={error} />} />;
}

export function MonthPicker({ value, onChange, label, error }: { value: string; onChange: (value: string) => void; label: string; error?: unknown }) {
  const [open, setOpen] = useState(false);
  const message = errorMessage(error);
  return <FieldShell label={label} error={message}><Button accessibilityLabel={label} onPress={() => { Keyboard.dismiss(); setOpen(true); }} variant="outline" className="min-h-12 justify-start rounded-xl border-[#DFE4EC] bg-white px-3"><CalendarDays color={value ? "#1454C4" : "#8A96A8"} size={18} /><ButtonText className={value ? "ml-2 text-sm font-semibold text-[#0F234D]" : "ml-2 text-sm font-normal text-[#8A96A8]"}>{value || "Pilih bulan"}</ButtonText></Button><CalendarSheet key={`${value}-${open}`} mode="month" open={open} onClose={() => setOpen(false)} value={value} onChange={onChange} title={label} /></FieldShell>;
}

export function SelectField({ label, value, options, onChange, error, required = false }: { label: string; value: string | null | undefined; options: SelectOption[]; onChange: (value: string) => void; error?: unknown; required?: boolean }) {
  const safeOptions = normalizedOptions(options);
  const safeValue = String(value ?? "");
  const message = errorMessage(error);
  const selected = safeOptions.some((option) => option.value === safeValue) ? safeValue : "";
  return <FieldShell label={label} required={required} error={message}><Select selectedValue={selected} onValueChange={(next) => onChange(String(next ?? ""))} isDisabled={!safeOptions.length}><SelectTrigger size="lg" variant="outline" className="min-h-12 w-full rounded-xl border-[#DFE4EC] bg-white px-3"><SelectInput placeholder={safeOptions.length ? "Pilih opsi" : "Belum ada pilihan tersedia"} className="flex-1 text-sm text-[#0F234D]" /><SelectIcon as={ChevronDown} className="ml-auto mr-0 text-[#6E7785]" /></SelectTrigger><SelectPortal><SelectBackdrop /><SelectContent className="min-h-[320px] rounded-t-3xl bg-white pb-safe"><SelectDragIndicatorWrapper><SelectDragIndicator /></SelectDragIndicatorWrapper>{safeOptions.map((option) => <SelectItem key={option.value || "option-" + option.label} label={option.label} value={option.value} />)}</SelectContent></SelectPortal></Select></FieldShell>;
}

export function SubmitButton({ label, loading, loadingLabel = "Menyimpan…", onPress }: { label: string; loading: boolean; loadingLabel?: string; onPress: () => void | Promise<void> }) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const busy = loading || pending;
  async function handlePress() { if (busy || inFlight.current) return; inFlight.current = true; setPending(true); try { await onPress(); } catch (error) { showActionError(error); } finally { inFlight.current = false; setPending(false); } }
  return <Button accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => void handlePress()} className="min-h-12 rounded-xl bg-[#1454C4]">{busy ? <ButtonSpinner color="#FFFFFF" /> : null}<ButtonText>{busy ? loadingLabel : label}</ButtonText></Button>;
}

export type CapturedLocation = { latitude: number; longitude: number; accuracy?: number | null; capturedAt: string };

export function LocationField({ value, onCapture, loading = false, label = "Lokasi GPS" }: { value?: CapturedLocation | null; onCapture: () => void | Promise<unknown>; loading?: boolean; label?: string }) {
  return <FieldShell label={label} helper={value ? `Akurasi ±${Math.round(value.accuracy ?? 0)} m · ${new Date(value.capturedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Ambil lokasi perangkat agar koordinat terlihat dan tersimpan bersama data."}><View style={formStyles.locationCard}><View style={formStyles.locationRow}><View style={formStyles.locationIcon}>{value ? <MapPin color="#1454C4" size={19} /> : <Crosshair color="#6E7785" size={19} />}</View><View style={formStyles.locationCopy}><Text style={formStyles.locationTitle}>{value ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}` : "Lokasi belum diambil"}</Text><Text style={formStyles.locationSubtitle}>{value ? "Koordinat siap disimpan" : "GPS perangkat diperlukan"}</Text></View><Pressable accessibilityLabel={value ? "Perbarui lokasi GPS" : "Ambil lokasi GPS"} accessibilityRole="button" disabled={loading} onPress={() => void onCapture()} style={[formStyles.locationButton, loading && formStyles.locationButtonDisabled]}><Crosshair color="#FFFFFF" size={16} /><Text style={formStyles.locationButtonText}>{loading ? "Mengambil…" : value ? "Perbarui" : "Ambil GPS"}</Text></Pressable></View></View></FieldShell>;
}

export { RHFInputField as InputField };
export function ErrorText({ value }: { value: unknown }) { const message = errorMessage(value); return message ? <Text className="text-xs text-[#C5312C]">{message}</Text> : null; }

const formStyles = StyleSheet.create({ locationCard: { backgroundColor: "#F6F9FF", borderColor: "#C8D8F7", borderRadius: 14, borderWidth: 1, padding: 11 }, locationRow: { alignItems: "center", flexDirection: "row", gap: 9 }, locationIcon: { alignItems: "center", backgroundColor: "#E5EEFF", borderRadius: 11, height: 38, justifyContent: "center", width: 38 }, locationCopy: { flex: 1, minWidth: 0 }, locationTitle: { color: "#0F234D", fontSize: 12, fontWeight: "900" }, locationSubtitle: { color: "#6E7785", fontSize: 10, marginTop: 3 }, locationButton: { alignItems: "center", backgroundColor: "#1454C4", borderRadius: 10, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 9 }, locationButtonDisabled: { opacity: 0.55 }, locationButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" } });
