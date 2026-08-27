import { useRef, useState } from "react";
import { Controller, type Control, type FieldErrors, type FieldValues, type UseFormRegister } from "react-hook-form";
import { ChevronDown, Eye, EyeOff } from "lucide-react-native";
import { Text } from "react-native";

import { Button, ButtonSpinner, ButtonText } from "./ui/button";
import { FormControl, FormControlError, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "./ui/form-control";
import { Input, InputField, InputSlot } from "./ui/input";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "./ui/modal";
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from "./ui/select";
import { isValidCalendarDate } from "../date-validation";
import { showActionError } from "../lib/feedback";

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

function RHFInputField<T extends FieldValues>({ name, label, register, errors, multiline = false, keyboardType = "default", placeholder, secureTextEntry = false, required = false }: { name: string; label: string; register: UseFormRegister<T>; errors: FieldErrors<T>; multiline?: boolean; keyboardType?: KeyboardType; placeholder?: string; secureTextEntry?: boolean; required?: boolean }) {
  const [visible, setVisible] = useState(false);
  const registered = register(name as never);
  const message = errorMessage(errors[name as keyof T]);
  return <FieldShell label={label} required={required} error={message}><Input isInvalid={Boolean(message)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField accessibilityLabel={label} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} keyboardType={keyboardType} multiline={multiline} numberOfLines={multiline ? 4 : 1} onBlur={registered.onBlur} onChangeText={(value) => void registered.onChange({ target: { name, value }, type: "change" })} placeholder={placeholder} placeholderTextColor="#8A96A8" ref={(node) => registered.ref(node)} secureTextEntry={secureTextEntry && !visible} className={multiline ? "min-h-28 py-3" : "py-3"} />{secureTextEntry ? <InputSlot accessibilityLabel={visible ? "Hide " + label : "Show " + label} accessibilityRole="button" onPress={() => setVisible((current) => !current)} className="min-h-11 min-w-10">{visible ? <EyeOff color="#6E7785" size={19} /> : <Eye color="#6E7785" size={19} />}</InputSlot> : null}</Input></FieldShell>;
}

export function TextInputField({ label, value, onChange, error, multiline = false, keyboardType = "default", placeholder, required = false, helper, secureTextEntry = false }: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; error?: unknown; multiline?: boolean; keyboardType?: KeyboardType; placeholder?: string; required?: boolean; helper?: string; secureTextEntry?: boolean }) {
  const message = errorMessage(error);
  const [visible, setVisible] = useState(false);
  return <FieldShell label={label} required={required} error={message} helper={helper}><Input isInvalid={Boolean(message)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField accessibilityLabel={label} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} keyboardType={keyboardType} multiline={multiline} numberOfLines={multiline ? 4 : 1} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#8A96A8" value={String(value ?? "")} secureTextEntry={secureTextEntry && !visible} className={multiline ? "min-h-28 py-3" : "py-3"} />{secureTextEntry ? <InputSlot accessibilityLabel={visible ? "Hide " + label : "Show " + label} accessibilityRole="button" onPress={() => setVisible((current) => !current)} className="min-h-11 min-w-10">{visible ? <EyeOff color="#6E7785" size={19} /> : <Eye color="#6E7785" size={19} />}</InputSlot> : null}</Input></FieldShell>;
}

export function DateField<T extends FieldValues>({ name, label, control, errors, required = false }: { name: string; label: string; control: Control<T>; errors: FieldErrors<T>; required?: boolean }) {
  const error = errors[name as keyof T];
  return <Controller control={control} name={name as never} render={({ field: { value, onChange } }) => <DatePicker value={String(value ?? "")} onChange={onChange} label={label} error={error} required={required} />} />;
}

export function DatePicker({ value, onChange, label, error, required = false }: { value: string; onChange: (value: string) => void; label: string; error?: unknown; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || new Date().toISOString().slice(0, 10));
  const [draftError, setDraftError] = useState("");
  const message = errorMessage(error);
  function openPicker() { setDraft(value || new Date().toISOString().slice(0, 10)); setDraftError(""); setOpen(true); }
  function save() { if (!isValidCalendarDate(draft)) { setDraftError("Masukkan tanggal kalender yang valid dengan format YYYY-MM-DD."); return; } onChange(draft); setDraftError(""); setOpen(false); }
  return <FieldShell label={label} required={required} error={message || draftError}><Button accessibilityLabel={label} onPress={openPicker} variant="outline" className="min-h-12 justify-start rounded-xl border-[#DFE4EC] bg-white px-3"><ButtonText className={value ? "text-sm font-semibold text-[#0F234D]" : "text-sm font-normal text-[#8A96A8]"}>{value || "Pilih tanggal (YYYY-MM-DD)"}</ButtonText></Button><Modal isOpen={open} onClose={() => setOpen(false)} size="full"><ModalBackdrop /><ModalContent className="mt-auto w-full rounded-t-3xl rounded-b-none p-5"><ModalHeader><Text className="text-lg font-black text-[#0F234D]">Pilih Tanggal</Text></ModalHeader><ModalBody><Text className="mb-2 text-xs text-[#6E7785]">Gunakan format YYYY-MM-DD</Text><Input isInvalid={Boolean(draftError)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField autoFocus accessibilityLabel="Tanggal" keyboardType="numeric" onChangeText={(next) => { setDraft(next); setDraftError(""); }} value={draft} className="py-3" /></Input>{draftError ? <Text className="mt-1 text-xs text-[#C5312C]">{draftError}</Text> : null}</ModalBody><ModalFooter><Button onPress={() => setOpen(false)} variant="outline" className="min-h-11 rounded-xl border-[#DFE4EC]"><ButtonText className="text-[#0F234D]">Batal</ButtonText></Button><Button onPress={save} className="min-h-11 rounded-xl bg-[#1454C4]"><ButtonText>Gunakan</ButtonText></Button></ModalFooter></ModalContent></Modal></FieldShell>;
}

export function MonthField<T extends FieldValues>({ name, label, control, errors }: { name: string; label: string; control: Control<T>; errors: FieldErrors<T> }) {
  const error = errors[name as keyof T];
  return <Controller control={control} name={name as never} render={({ field: { value, onChange } }) => <MonthPicker value={String(value ?? "")} onChange={onChange} label={label} error={error} />} />;
}

export function MonthPicker({ value, onChange, label, error }: { value: string; onChange: (value: string) => void; label: string; error?: unknown }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || new Date().toISOString().slice(0, 7));
  const [draftError, setDraftError] = useState("");
  const message = errorMessage(error);
  function openPicker() { setDraft(value || new Date().toISOString().slice(0, 7)); setDraftError(""); setOpen(true); }
  function save() { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft)) { setDraftError("Masukkan periode dengan format YYYY-MM."); return; } onChange(draft); setDraftError(""); setOpen(false); }
  return <FieldShell label={label} error={message || draftError}><Button accessibilityLabel={label} onPress={openPicker} variant="outline" className="min-h-12 justify-start rounded-xl border-[#DFE4EC] bg-white px-3"><ButtonText className={value ? "text-sm font-semibold text-[#0F234D]" : "text-sm font-normal text-[#8A96A8]"}>{value || "Pilih bulan (YYYY-MM)"}</ButtonText></Button><Modal isOpen={open} onClose={() => setOpen(false)} size="full"><ModalBackdrop /><ModalContent className="mt-auto w-full rounded-t-3xl rounded-b-none p-5"><ModalHeader><Text className="text-lg font-black text-[#0F234D]">Pilih Periode</Text></ModalHeader><ModalBody><Input isInvalid={Boolean(draftError)} className="min-h-12 rounded-xl border-[#DFE4EC] bg-white px-3"><InputField autoFocus accessibilityLabel="Periode" keyboardType="numeric" onChangeText={(next) => { setDraft(next); setDraftError(""); }} value={draft} className="py-3" /></Input>{draftError ? <Text className="mt-1 text-xs text-[#C5312C]">{draftError}</Text> : null}</ModalBody><ModalFooter><Button onPress={() => setOpen(false)} variant="outline" className="min-h-11 rounded-xl border-[#DFE4EC]"><ButtonText className="text-[#0F234D]">Batal</ButtonText></Button><Button onPress={save} className="min-h-11 rounded-xl bg-[#1454C4]"><ButtonText>Gunakan</ButtonText></Button></ModalFooter></ModalContent></Modal></FieldShell>;
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

export { RHFInputField as InputField };
export function ErrorText({ value }: { value: unknown }) { const message = errorMessage(value); return message ? <Text className="text-xs text-[#C5312C]">{message}</Text> : null; }
