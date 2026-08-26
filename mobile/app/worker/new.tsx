import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { TextInput } from "../../src/components/ui/TextInput";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { ErrorText, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { createFieldWorker } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";
import { workerFormSchema } from "../../src/form-schemas";

export default function NewWorkerScreen() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [fullName, setFullName] = useState(""); const [phone, setPhone] = useState(""); const [position, setPosition] = useState(""); const [notes, setNotes] = useState(""); const [status, setStatus] = useState("ACTIVE"); const [errors, setErrors] = useState<Record<string, string>>({});
  if (!role) return null;
  async function save() { const parsed = workerFormSchema.safeParse({ fullName, phone, position, notes, status }); const nextErrors: Record<string, string> = {}; if (!parsed.success) parsed.error.issues.forEach((issue) => { const key = String(issue.path[0] ?? "form"); if (!nextErrors[key]) nextErrors[key] = issue.message; }); setErrors(nextErrors); if (!parsed.success) return; setSaving(true); try { await createFieldWorker(parsed.data); Alert.alert("Pekerja ditambahkan", "Data pekerja berhasil disimpan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa koneksi lalu coba lagi."); } finally { setSaving(false); } }
  return <><Header role={role} title="Pekerja Baru" subtitle="Data induk pekerja lapangan" /><Screen><Field label="Nama lengkap" required error={errors.fullName} value={fullName} onChange={(value) => { setFullName(value); setErrors((current) => ({ ...current, fullName: "" })); }} /><Field label="Nomor telepon" error={errors.phone} value={phone} onChange={(value) => { setPhone(value); setErrors((current) => ({ ...current, phone: "" })); }} keyboardType="phone-pad" /><Field label="Jabatan" error={errors.position} value={position} onChange={(value) => { setPosition(value); setErrors((current) => ({ ...current, position: "" })); }} /><SelectField label="Status" required value={status} onChange={setStatus} options={[{ label: "Aktif", value: "ACTIVE" }, { label: "Nonaktif", value: "INACTIVE" }]} /><Field label="Catatan" error={errors.notes} value={notes} onChange={(value) => { setNotes(value); setErrors((current) => ({ ...current, notes: "" })); }} multiline /><SubmitButton label="Simpan Pekerja" loading={saving} onPress={() => void save()} /></Screen></>;
}

function Field({ label, value, onChange, multiline = false, keyboardType = "default", error, required = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; keyboardType?: "default" | "phone-pad"; error?: string; required?: boolean }) { return <><Text style={styles.label}>{label}{required ? " *" : ""}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.multiline, error && styles.invalid]} /><ErrorText value={error} /></>; }
const styles = StyleSheet.create({ label: { color: colors.text, fontSize: 11, fontWeight: "800", marginBottom: -spacing.sm }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, invalid: { borderColor: colors.danger }, multiline: { minHeight: 96, textAlignVertical: "top" } });
