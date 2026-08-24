import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput } from "react-native";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DatePicker, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { getBlocks, getFieldOfficers, getFieldWorkers, createFieldTask } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

export default function NewTaskScreen() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [blockId, setBlockId] = useState(""); const [officerId, setOfficerId] = useState(""); const [workerId, setWorkerId] = useState(""); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [priority, setPriority] = useState("MEDIUM"); const [dueDate, setDueDate] = useState("");
  const blocks = useQuery({ queryKey: ["blocks", "task-form"], queryFn: () => getBlocks(), enabled: Boolean(role) }); const officers = useQuery({ queryKey: ["field-officers"], queryFn: getFieldOfficers, enabled: Boolean(role) }); const workers = useQuery({ queryKey: ["field-workers", "task-form"], queryFn: () => getFieldWorkers({ status: "ACTIVE" }), enabled: Boolean(role) });
  if (!role) return null;
  async function save() { if (!blockId || !officerId || !title.trim()) return Alert.alert("Data belum lengkap", "Pilih blok, petugas, dan isi judul tugas."); setSaving(true); try { await createFieldTask({ blockId, assignedFieldOfficerId: officerId, assignedWorkerId: workerId || undefined, title, description: description || undefined, priority, dueDate: dueDate || undefined }); Alert.alert("Tugas dibuat", "Tugas lapangan telah diberikan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat membuat tugas", error instanceof Error ? error.message : "Periksa data dan coba lagi."); } finally { setSaving(false); } }
  return <><Header role={role} title="Tugas Lapangan Baru" subtitle="Tetapkan pekerjaan dan penanggung jawab" /><Screen><SelectField label="Blok" value={blockId} onChange={setBlockId} options={(blocks.data?.blocks ?? []).map((item) => ({ label: `${item.code} · ${item.name}`, value: item.id }))} /><SelectField label="Petugas lapangan" value={officerId} onChange={setOfficerId} options={(officers.data?.officers ?? []).map((item) => ({ label: item.name, value: item.id }))} /><SelectField label="Pekerja (opsional)" value={workerId} onChange={setWorkerId} options={[{ label: "Tanpa pekerja khusus", value: "" }, ...(workers.data?.items ?? []).map((item) => ({ label: String(item.fullName), value: String(item.id) }))]} /><Text style={styles.label}>Judul tugas</Text><TextInput value={title} onChangeText={setTitle} style={styles.input} /><Text style={styles.label}>Deskripsi</Text><TextInput value={description} onChangeText={setDescription} multiline style={[styles.input, styles.multiline]} /><SelectField label="Prioritas" value={priority} onChange={setPriority} options={[{ label: "Rendah", value: "LOW" }, { label: "Sedang", value: "MEDIUM" }, { label: "Tinggi", value: "HIGH" }, { label: "Mendesak", value: "URGENT" }]} /><DatePicker label="Tenggat (opsional)" value={dueDate} onChange={setDueDate} /><SubmitButton label="Simpan Tugas" loading={saving} onPress={() => void save()} /></Screen></>;
}

const styles = StyleSheet.create({ label: { color: colors.text, fontSize: 11, fontWeight: "800", marginBottom: -spacing.sm }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, multiline: { minHeight: 96, textAlignVertical: "top" } });
