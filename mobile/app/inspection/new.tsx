import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { clearInspectionDraftLocally, loadInspectionDraft, saveInspectionDraftLocally } from "../../src/lib/drafts";
import { createInspection, createInspectionUploadUrl, getBlocks, getInspection, saveInspectionDraft } from "../../src/lib/api";
import { queueInspectionSubmission } from "../../src/offline/sync";
import { colors, spacing } from "../../src/theme";

const schema = z.object({
  blockId: z.string().uuid("Pilih blok."), inspectedAt: z.string().optional(), excavatorCount: z.coerce.number().int().min(0), workerCount: z.coerce.number().int().min(0), condition: z.string().trim().min(1), conditionRoad: z.string().trim().min(1), conditionEnvironment: z.string().trim().min(1), conditionActivity: z.string().trim().min(1), findings: z.string().max(10000).optional(), notes: z.string().max(10000).optional(),
});
type Values = z.infer<typeof schema>;
type StoredPhoto = { storageKey: string; contentType: string; size: number; capturedAt?: string };
const steps = ["Data", "Dokumentasi", "Tinjau"];

export default function NewInspection() {
  const { role } = useAuth(); const router = useRouter(); const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const [step, setStep] = useState(0); const [saving, setSaving] = useState(false); const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]); const [storedPhotos, setStoredPhotos] = useState<StoredPhoto[]>([]);
  const blocks = useQuery({ queryKey: ["blocks", "inspection-form"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  const draft = useQuery({ queryKey: ["inspection", draftId], queryFn: () => getInspection(draftId!), enabled: Boolean(draftId) });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { excavatorCount: 0, workerCount: 0, condition: "Aktif", conditionRoad: "Baik", conditionEnvironment: "Aman", conditionActivity: "Normal" } });
  useEffect(() => { if (draftId) return; void loadInspectionDraft().then((value) => { if (value) form.reset({ ...value, conditionActivity: "Normal" }); }); }, [draftId, form]);
  useEffect(() => { if (!draft.data || draft.data.item.status !== "DRAFT") return; const item = draft.data.item; form.reset({ blockId: String(item.blockId), inspectedAt: item.inspectedAt ? String(item.inspectedAt).slice(0, 10) : undefined, excavatorCount: Number(item.excavatorCount), workerCount: Number(item.workerCount), condition: String(item.condition), conditionRoad: String(item.roadCondition ?? "Baik"), conditionEnvironment: String(item.environmentCondition ?? "Aman"), conditionActivity: String(item.activityCondition ?? "Normal"), findings: String(item.findings ?? ""), notes: String(item.notes ?? "") }); setStoredPhotos(draft.data.photos.map((photo) => ({ storageKey: String(photo.storageKey), contentType: String(photo.contentType), size: Number(photo.sizeBytes), capturedAt: photo.capturedAt ? String(photo.capturedAt) : undefined }))); }, [draft.data, form]);
  if (!role) return null;

  async function choosePhotos(source: "camera" | "library") { const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert("Izin diperlukan", source === "camera" ? "Izinkan kamera untuk mendokumentasikan pemeriksaan." : "Izinkan akses galeri untuk menambahkan foto."); const remaining = 3 - photos.length - storedPhotos.length; if (!remaining) return Alert.alert("Batas foto", "Maksimal tiga foto dapat dilampirkan."); const result = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8 }); if (!result.canceled) setPhotos((current) => [...current, ...(result.assets ?? [])].slice(0, 3 - storedPhotos.length)); }
  function addPhoto() { Alert.alert("Tambah foto", "Pilih sumber dokumentasi.", [{ text: "Kamera", onPress: () => void choosePhotos("camera") }, { text: "Galeri", onPress: () => void choosePhotos("library") }, { text: "Batal", style: "cancel" }]); }
  async function uploadPhotos(inspectionId: string) { return Promise.all(photos.map(async (photo) => { const size = photo.fileSize ?? 0; if (!size) throw new Error("Ukuran foto tidak tersedia."); const contentType = photo.mimeType ?? "image/jpeg"; const upload = await createInspectionUploadUrl({ inspectionId, contentType, size, originalName: photo.fileName ?? `pemeriksaan-${Date.now()}.jpg` }) as { key: string; uploadUrl: string }; const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: await (await fetch(photo.uri)).blob() }); if (!response.ok) throw new Error("Unggah foto pemeriksaan gagal."); return { storageKey: upload.key, contentType, size, originalName: photo.fileName ?? "foto-pemeriksaan.jpg", capturedAt: new Date().toISOString() }; })); }
  async function continueToDocumentation() { const valid = await form.trigger(["blockId", "excavatorCount", "workerCount", "condition", "conditionRoad", "conditionEnvironment", "conditionActivity"]); if (valid) setStep(1); }
  async function save(values: Values, mode: "draft" | "submit") {
    setSaving(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Izin lokasi diperlukan untuk menyimpan pemeriksaan.");
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const inspectionId = draftId ?? crypto.randomUUID();
      const baseInput = {
        blockId: values.blockId,
        inspectedAt: values.inspectedAt || undefined,
        excavatorCount: values.excavatorCount,
        workerCount: values.workerCount,
        condition: values.condition,
        roadCondition: values.conditionRoad,
        environmentCondition: values.conditionEnvironment,
        activityCondition: values.conditionActivity,
        findings: values.findings,
        notes: values.notes,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        gpsAccuracy: location.coords.accuracy ?? 0,
        gpsCapturedAt: new Date().toISOString(),
        photos: storedPhotos,
      };

      if (mode === "draft") {
        const uploaded = await uploadPhotos(inspectionId);
        await saveInspectionDraft({ ...baseInput, id: inspectionId, photos: [...storedPhotos, ...uploaded] });
        await clearInspectionDraftLocally();
        Alert.alert("Draft tersimpan", "Pemeriksaan dapat dilanjutkan dari daftar Draft.", [{ text: "OK", onPress: () => router.replace(`/inspection/${inspectionId}`) }]);
        return;
      }

      try {
        const uploaded = await uploadPhotos(inspectionId);
        await createInspection({ ...baseInput, id: inspectionId, photos: [...storedPhotos, ...uploaded] });
        await clearInspectionDraftLocally();
        Alert.alert("Berhasil", "Pemeriksaan berhasil dikirim.", [{ text: "OK", onPress: () => router.replace("/inspections") }]);
      } catch {
        await queueInspectionSubmission(inspectionId, baseInput, photos);
        await clearInspectionDraftLocally();
        Alert.alert("Data diantrikan", "Pemeriksaan dan foto tersimpan aman di perangkat. Data akan dikirim otomatis saat koneksi kembali.", [{ text: "OK", onPress: () => router.replace("/inspections") }]);
      }
    } catch (error) {
      await saveInspectionDraftLocally(values);
      Alert.alert("Draft tersimpan di perangkat", error instanceof Error ? error.message : "Data belum dapat diproses. Coba lagi saat lokasi dan koneksi tersedia.");
    } finally {
      setSaving(false);
    }
  }
  const values = form.getValues();
  return <><Header role={role} title={draftId ? "Lanjutkan Draft" : "Pemeriksaan Baru"} subtitle="Data, dokumentasi, lalu tinjau" /><Screen><View style={styles.steps}>{steps.map((label, index) => <Pressable key={label} onPress={() => index <= step && setStep(index)} style={[styles.step, step === index && styles.stepActive]}><Text style={[styles.stepText, step === index && styles.stepTextActive]}>{index + 1}. {label}</Text></Pressable>)}</View>{step === 0 ? <><Text style={styles.heading}>Data Pemeriksaan</Text><SelectField label="Blok" value={form.watch("blockId") ?? ""} options={(blocks.data?.blocks ?? []).map((block) => ({ label: `${block.code} · ${block.name}`, value: block.id }))} onChange={(value) => form.setValue("blockId", value, { shouldValidate: true })} /><DateField name="inspectedAt" label="Tanggal pemeriksaan" control={form.control} errors={form.formState.errors} /><InputField name="excavatorCount" label="Jumlah excavator" keyboardType="numeric" register={form.register} errors={form.formState.errors} /><InputField name="workerCount" label="Jumlah pekerja" keyboardType="numeric" register={form.register} errors={form.formState.errors} /><SelectField label="Kondisi blok" value={form.watch("condition")} options={["Aktif", "Berhenti", "Belum Operasi"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("condition", value, { shouldValidate: true })} /><SelectField label="Kondisi jalan" value={form.watch("conditionRoad")} options={["Baik", "Rusak", "Perlu Perbaikan"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("conditionRoad", value, { shouldValidate: true })} /><SelectField label="Kondisi lingkungan" value={form.watch("conditionEnvironment")} options={["Aman", "Waspada", "Berisiko"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("conditionEnvironment", value, { shouldValidate: true })} /><SelectField label="Kondisi aktivitas" value={form.watch("conditionActivity")} options={["Normal", "Terbatas", "Terhenti"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("conditionActivity", value, { shouldValidate: true })} /><SubmitButton label="Lanjut ke Dokumentasi" loading={saving} onPress={() => void continueToDocumentation()} /></> : null}{step === 1 ? <><Text style={styles.heading}>Dokumentasi</Text><InputField name="findings" label="Temuan" multiline register={form.register} errors={form.formState.errors} /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} /><Pressable onPress={addPhoto} style={styles.photoButton}><Text style={styles.photoText}>Tambah Foto ({photos.length + storedPhotos.length}/3)</Text></Pressable>{photos.length ? <View style={styles.photos}>{photos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.photo} />)}</View> : null}<View style={styles.actions}><SubmitButton label="Kembali" loading={saving} onPress={() => setStep(0)} /><SubmitButton label="Tinjau Pemeriksaan" loading={saving} onPress={() => setStep(2)} /></View></> : null}{step === 2 ? <><Text style={styles.heading}>Tinjau Sebelum Kirim</Text><Summary label="Blok" value={(blocks.data?.blocks ?? []).find((block) => block.id === values.blockId)?.name ?? "Belum dipilih"} /><Summary label="Kondisi" value={`${values.condition} · Jalan ${values.conditionRoad} · Lingkungan ${values.conditionEnvironment} · Aktivitas ${values.conditionActivity}`} /><Summary label="Sumber daya" value={`${values.excavatorCount} excavator · ${values.workerCount} pekerja`} /><Summary label="Dokumentasi" value={`${photos.length + storedPhotos.length} foto · ${values.findings || "Tidak ada temuan"}`} /><View style={styles.actions}><SubmitButton label="Kembali" loading={saving} onPress={() => setStep(1)} /><SubmitButton label="Simpan Draft" loading={saving} onPress={() => void form.handleSubmit((payload) => save(payload, "draft"))()} /><SubmitButton label="Kirim Data" loading={saving} onPress={() => void form.handleSubmit((payload) => save(payload, "submit"))()} /></View></> : null}</Screen></>;
}

function Summary({ label, value }: { label: string; value: string }) { return <View style={styles.summary}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ steps: { flexDirection: "row", gap: 6 }, step: { borderColor: colors.border, borderRadius: 9, borderWidth: 1, flex: 1, padding: 9 }, stepActive: { backgroundColor: "#EAF1FF", borderColor: colors.primary }, stepText: { color: colors.textMuted, fontSize: 10, fontWeight: "800", textAlign: "center" }, stepTextActive: { color: colors.primary }, heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, photoButton: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, padding: 13 }, photoText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, photos: { flexDirection: "row", gap: spacing.sm }, photo: { borderRadius: 8, height: 64, width: 64 }, actions: { gap: spacing.sm }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 4, padding: spacing.md }, summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, summaryValue: { color: colors.text, fontSize: 12, lineHeight: 18 } });
