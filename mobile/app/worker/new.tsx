import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput } from "react-native";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { SelectField, SubmitButton } from "../../src/components/NativeForm";
import { createFieldWorker } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

export default function NewWorkerScreen() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [fullName, setFullName] = useState(""); const [phone, setPhone] = useState(""); const [position, setPosition] = useState(""); const [notes, setNotes] = useState(""); const [status, setStatus] = useState("ACTIVE");
  if (!role) return null;
  async function save() { if (!fullName.trim()) return Alert.alert("Nama wajib diisi", "Masukkan nama pekerja."); setSaving(true); try { await createFieldWorker({ fullName, phone: phone || undefined, position: position || undefined, notes: notes || undefined, status }); Alert.alert("Pekerja ditambahkan", "Data pekerja berhasil disimpan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Coba lagi."); } finally { setSaving(false); } }
  return <><Header role={role} title="Pekerja Baru" subtitle="Data induk pekerja lapangan" /><Screen><Field label="Nama lengkap" value={fullName} onChange={setFullName} /><Field label="Nomor telepon" value={phone} onChange={setPhone} keyboardType="phone-pad" /><Field label="Jabatan" value={position} onChange={setPosition} /><SelectField label="Status" value={status} onChange={setStatus} options={[{ label: "Aktif", value: "ACTIVE" }, { label: "Nonaktif", value: "INACTIVE" }]} /><Field label="Catatan" value={notes} onChange={setNotes} multiline /><SubmitButton label="Simpan Pekerja" loading={saving} onPress={() => void save()} /></Screen></>;
}

function Field({ label, value, onChange, multiline = false, keyboardType = "default" }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; keyboardType?: "default" | "phone-pad" }) { return <><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.multiline]} /></>; }
const styles = StyleSheet.create({ label: { color: colors.text, fontSize: 11, fontWeight: "800", marginBottom: -spacing.sm }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, multiline: { minHeight: 96, textAlignVertical: "top" } });
