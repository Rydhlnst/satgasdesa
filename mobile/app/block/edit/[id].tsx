import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../../src/auth";
import { ErrorState, Header, LoadingState, Screen } from "../../../src/components/Screen";
import { ErrorText, SelectField, SubmitButton } from "../../../src/components/NativeForm";
import { getBlockDetails, updateBlock } from "../../../src/lib/api";
import { blockFormSchema } from "../../../src/block-form-schema";
import { colors, spacing } from "../../../src/theme";
import { getCurrentLocation } from "../../../src/lib/location";

type Draft = Record<string, string>;

export default function EditBlock() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["block", id], queryFn: () => getBlockDetails(id), enabled: Boolean(role && id) });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Edit Blok" /><Screen><LoadingState /></Screen></>;
  if (query.isError || !query.data) return <><Header role={role} title="Edit Blok" /><Screen><ErrorState message="Data blok tidak dapat dimuat." onRetry={() => query.refetch()} /></Screen></>;

  const values = draft ?? blockValues(query.data.item);

  function updateField(key: string, value: string) {
    setDraft((current) => ({ ...(current ?? values), [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function field(key: string, label: string, multiline = false, keyboardType: "default" | "numeric" = "default") {
    return <View style={styles.field} key={key}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} keyboardType={keyboardType} value={values[key] ?? ""} onChangeText={(value) => updateField(key, value)} multiline={multiline} placeholder={multiline ? "Opsional" : undefined} placeholderTextColor={colors.textMuted} style={[styles.input, multiline && styles.multiline, errors[key] ? styles.invalid : undefined]} /><ErrorText value={errors[key]} /></View>;
  }

  async function captureLocation() {
    try {
      const location = await getCurrentLocation("mengisi latitude dan longitude");
      updateField("latitude", String(location.coords.latitude));
      updateField("longitude", String(location.coords.longitude));
    } catch (error) {
      Alert.alert("Lokasi tidak tersedia", `${error instanceof Error ? error.message : "Lokasi belum dapat dibaca."} Anda juga dapat mengisi latitude dan longitude secara manual.`);
    }
  }

  async function save() {
    const parsed = blockFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { const key = String(issue.path[0] ?? "form"); if (!nextErrors[key]) nextErrors[key] = issue.message; });
      setErrors(nextErrors);
      Alert.alert("Periksa data", parsed.error.issues[0]?.message ?? "Lengkapi data yang wajib diisi.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateBlock({ id, ...parsed.data, startDate: parsed.data.startDate || undefined, areaHectares: parsed.data.areaHectares ?? undefined });
      await client.invalidateQueries({ queryKey: ["block", id] });
      await client.invalidateQueries({ queryKey: ["blocks"] });
      router.back();
    } catch (error) {
      Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data blok.");
    } finally { setSaving(false); }
  }

  return <><Header role={role} title="Edit Blok" subtitle="Perbarui data atau status operasional" /><Screen><Text style={styles.heading}>Informasi Blok</Text>{field("code", "Kode blok *")}{field("name", "Nama blok *")}<Text style={styles.label}>Status</Text><SelectField label="" value={values.status} onChange={(value) => updateField("status", value)} options={[{ label: "Aktif", value: "ACTIVE" }, { label: "Berhenti", value: "STOPPED" }, { label: "Belum Operasi", value: "NOT_OPERATING" }]} /><ErrorText value={errors.status} /><Text style={styles.label}>Prioritas</Text><SelectField label="" value={values.priority} onChange={(value) => updateField("priority", value)} options={[{ label: "Rendah", value: "LOW" }, { label: "Normal", value: "NORMAL" }, { label: "Tinggi", value: "HIGH" }, { label: "Kritis", value: "CRITICAL" }]} /><ErrorText value={errors.priority} />{field("latitude", "Latitude *", false, "numeric")}{field("longitude", "Longitude *", false, "numeric")}<Pressable accessibilityRole="button" onPress={() => void captureLocation()} style={styles.location}><Text style={styles.locationText}>Gunakan Lokasi Saat Ini</Text></Pressable>{field("areaHectares", "Luas area (hektar)", false, "numeric")}{field("managerName", "Pengelola")}{field("locationPicName", "PJ lokasi")}{field("fieldPicName", "PJ lapangan")}{field("contact", "Kontak")}{field("workerCount", "Jumlah pekerja", false, "numeric")}{field("operationalCondition", "Kondisi operasional *", true)}{field("notes", "Catatan", true)}<ErrorText value={errors.form} /><SubmitButton label="Simpan Perubahan" loading={saving} onPress={() => void save()} /></Screen></>;
}

function blockValues(item: Record<string, string | number | null>): Draft {
  return { code: String(item.code ?? ""), name: String(item.name ?? ""), status: String(item.status ?? "NOT_OPERATING"), priority: String(item.priority ?? "NORMAL"), latitude: String(item.latitude ?? ""), longitude: String(item.longitude ?? ""), areaHectares: String(item.areaHectares ?? ""), managerName: String(item.managerName ?? ""), locationPicName: String(item.locationPicName ?? ""), fieldPicName: String(item.fieldPicName ?? ""), contact: String(item.contact ?? ""), workerCount: String(item.workerCount ?? "0"), operationalCondition: String(item.operationalCondition ?? ""), startDate: String(item.startDate ?? ""), notes: String(item.notes ?? "") };
}

const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, field: { gap: 6 }, label: { color: colors.text, fontSize: 11, fontWeight: "800" }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, invalid: { borderColor: colors.danger }, multiline: { minHeight: 90, textAlignVertical: "top" }, location: { alignItems: "center", borderColor: colors.primary, borderRadius: 9, borderWidth: 1, padding: 11 }, locationText: { color: colors.primary, fontSize: 11, fontWeight: "900" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, marginTop: spacing.sm, padding: 14 }, primaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" } });
