import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { CapturedLocation, DateField, InputField, LocationField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { inspectionFormSchema as schema } from "../../src/form-schemas";
import { clearInspectionDraftLocally, loadInspectionDraft, saveInspectionDraftLocally } from "../../src/lib/drafts";
import { createInspection, createInspectionUploadUrl, finalizeInspection, getBlocks, getInspection, saveInspectionDraft } from "../../src/lib/api";
import { queueInspectionSubmission } from "../../src/offline/sync";
import { colors, spacing } from "../../src/theme";
import { getCurrentLocation } from "../../src/lib/location";
import { isRetryableNetworkError } from "../../src/lib/feedback";
import { createClientId } from "../../src/lib/id";

type Values = z.infer<typeof schema>;
type StoredPhoto = { storageKey: string; contentType: string; size: number; capturedAt?: string };
const steps = ["Data", "Dokumentasi", "Tinjau"];

export default function NewInspection() {
  const { role } = useAuth(); const router = useRouter(); const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const [step, setStep] = useState(0); const [saving, setSaving] = useState(false); const [locationLoading, setLocationLoading] = useState(false); const [capturedLocation, setCapturedLocation] = useState<CapturedLocation | null>(null); const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]); const [storedPhotos, setStoredPhotos] = useState<StoredPhoto[]>([]);
  const blocks = useQuery({ queryKey: ["blocks", "inspection-form"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  const draft = useQuery({ queryKey: ["inspection", draftId], queryFn: () => getInspection(draftId!), enabled: Boolean(role && draftId) });
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { excavatorCount: 0, workerCount: 0, condition: "Aktif", conditionRoad: "Baik", conditionEnvironment: "Aman", conditionActivity: "Normal" } });
  useEffect(() => { if (draftId) return; void loadInspectionDraft().then((value) => { if (value) form.reset({ ...value, conditionActivity: "Normal" }); }); }, [draftId, form]);
  useEffect(() => { if (!draft.data || draft.data.item.status !== "DRAFT") return; const item = draft.data.item; form.reset({ blockId: String(item.blockId), inspectedAt: item.inspectedAt ? String(item.inspectedAt).slice(0, 10) : undefined, excavatorCount: Number(item.excavatorCount), workerCount: Number(item.workerCount), condition: String(item.condition), conditionRoad: String(item.roadCondition ?? "Baik"), conditionEnvironment: String(item.environmentCondition ?? "Aman"), conditionActivity: String(item.activityCondition ?? "Normal"), findings: String(item.findings ?? ""), notes: String(item.notes ?? "") }); setStoredPhotos(draft.data.photos.map((photo) => ({ storageKey: String(photo.storageKey), contentType: String(photo.contentType), size: Number(photo.sizeBytes), capturedAt: photo.capturedAt ? String(photo.capturedAt) : undefined }))); }, [draft.data, form]);
  if (!role) return null;

  async function captureLocation() {
    setLocationLoading(true);
    try {
      const result = await getCurrentLocation("menyimpan pemeriksaan");
      const next = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy, capturedAt: new Date().toISOString() };
      setCapturedLocation(next);
      return next;
    } catch (error) {
      Alert.alert("Lokasi tidak tersedia", error instanceof Error ? error.message : "Lokasi perangkat belum dapat dibaca.");
      throw error;
    } finally { setLocationLoading(false); }
  }

  async function choosePhotos(source: "camera" | "library") { const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert("Izin diperlukan", source === "camera" ? "Izinkan kamera untuk mendokumentasikan pemeriksaan." : "Izinkan akses galeri untuk menambahkan foto."); const remaining = 3 - photos.length - storedPhotos.length; if (!remaining) return Alert.alert("Batas foto", "Maksimal tiga foto dapat dilampirkan."); const result = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8 }); if (!result.canceled) setPhotos((current) => [...current, ...(result.assets ?? [])].slice(0, 3 - storedPhotos.length)); }
  function addPhoto() { Alert.alert("Tambah foto", "Pilih sumber dokumentasi.", [{ text: "Kamera", onPress: () => void choosePhotos("camera") }, { text: "Galeri", onPress: () => void choosePhotos("library") }, { text: "Batal", style: "cancel" }]); }
  async function uploadPhotos(inspectionId: string) { return Promise.all(photos.map(async (photo) => { const size = photo.fileSize ?? 0; if (!size) throw new Error("Ukuran foto tidak tersedia."); if (size > 10 * 1024 * 1024) throw new Error("Setiap foto pemeriksaan maksimal 10 MB."); const contentType = photo.mimeType ?? "image/jpeg"; const upload = await createInspectionUploadUrl({ inspectionId, contentType, size, originalName: photo.fileName ?? `pemeriksaan-${Date.now()}.jpg` }) as { key: string; uploadUrl: string }; const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: await (await fetch(photo.uri)).blob() }); if (!response.ok) throw new Error("Unggah foto pemeriksaan gagal."); return { storageKey: upload.key, contentType, size, originalName: photo.fileName ?? "foto-pemeriksaan.jpg", capturedAt: new Date().toISOString() }; })); }
  async function continueToDocumentation() { const valid = await form.trigger(["blockId", "excavatorCount", "workerCount", "condition", "conditionRoad", "conditionEnvironment", "conditionActivity"]); if (valid) setStep(1); else Alert.alert("Periksa data", "Pilih blok dan lengkapi jumlah serta kondisi pemeriksaan."); }
  async function save(values: Values, mode: "draft" | "submit") {
    setSaving(true);
    try {
      const location = capturedLocation ?? await captureLocation();
      const inspectionId = draftId ?? createClientId();
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
        latitude: location.latitude,
        longitude: location.longitude,
        gpsAccuracy: location.accuracy ?? 0,
        gpsCapturedAt: location.capturedAt,
        photos: storedPhotos,
      };

      if (mode === "draft") {
        const uploaded = await uploadPhotos(inspectionId);
        await saveInspectionDraft({ ...baseInput, id: inspectionId, photos: [...storedPhotos, ...uploaded] });
        await clearInspectionDraftLocally();
        Alert.alert("Draf tersimpan", "Pemeriksaan dapat dilanjutkan dari daftar Draf.", [{ text: "OK", onPress: () => router.replace(`/inspection/${inspectionId}`) }]);
        return;
      }

      try {
        const uploaded = await uploadPhotos(inspectionId);
        const submitInspection = draftId ? finalizeInspection : createInspection;
        await submitInspection({ ...baseInput, id: inspectionId, photos: [...storedPhotos, ...uploaded] });
        await clearInspectionDraftLocally();
        Alert.alert("Berhasil", "Pemeriksaan berhasil dikirim.", [{ text: "OK", onPress: () => router.replace("/inspections") }]);
      } catch (error) {
        if (!isRetryableNetworkError(error)) throw error;
        await queueInspectionSubmission(inspectionId, baseInput, photos);
        await clearInspectionDraftLocally();
        Alert.alert("Data diantrikan", "Pemeriksaan dan foto tersimpan aman di perangkat. Data akan dikirim otomatis saat koneksi kembali.", [{ text: "OK", onPress: () => router.replace("/inspections") }]);
      }
    } catch (error) {
      await saveInspectionDraftLocally(values);
      Alert.alert("Draf tersimpan di perangkat", error instanceof Error ? error.message : "Data belum dapat diproses. Coba lagi saat lokasi dan koneksi tersedia.");
    } finally {
      setSaving(false);
    }
  }
  const values = form.getValues();
  return (
    <>
      <Header role={role} title={draftId ? "Lanjutkan Draf" : "Pemeriksaan Baru"} subtitle="Data, dokumentasi, lalu tinjau" />
      <Screen>
        <View style={styles.steps}>
          {steps.map((label, index) => (
            <Pressable key={label} onPress={() => index <= step && setStep(index)} style={[styles.step, step === index && styles.stepActive]}>
              <Text style={[styles.stepText, step === index && styles.stepTextActive]}>{index + 1}. {label}</Text>
            </Pressable>
          ))}
        </View>
        {step === 0 ? (
          <>
            <Text style={styles.heading}>Data Pemeriksaan</Text>
            <SelectField label="Blok" value={form.watch("blockId") ?? ""} options={(blocks.data?.blocks ?? []).map((block) => ({ label: `${block.code} · ${block.name}`, value: block.id }))} onChange={(value) => form.setValue("blockId", value, { shouldValidate: true })} />
            <DateField name="inspectedAt" label="Tanggal pemeriksaan" control={form.control} errors={form.formState.errors} />
            <LocationField value={capturedLocation} loading={locationLoading} onCapture={captureLocation} />
            <InputField name="excavatorCount" label="Jumlah alat berat" keyboardType="numeric" register={form.register} errors={form.formState.errors} />
            <InputField name="workerCount" label="Jumlah pekerja" keyboardType="numeric" register={form.register} errors={form.formState.errors} />
            <SelectField label="Kondisi blok" value={form.watch("condition")} options={["Aktif", "Berhenti", "Belum Operasi"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("condition", value, { shouldValidate: true })} />
            <SelectField label="Kondisi jalan" value={form.watch("conditionRoad")} options={["Baik", "Rusak", "Perlu Perbaikan"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("conditionRoad", value, { shouldValidate: true })} />
            <SelectField label="Kondisi lingkungan" value={form.watch("conditionEnvironment")} options={["Aman", "Waspada", "Berisiko"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("conditionEnvironment", value, { shouldValidate: true })} />
            <SelectField label="Kondisi aktivitas" value={form.watch("conditionActivity")} options={["Normal", "Terbatas", "Terhenti"].map((value) => ({ label: value, value }))} onChange={(value) => form.setValue("conditionActivity", value, { shouldValidate: true })} />
            <SubmitButton label="Lanjut ke Dokumentasi" loading={saving} onPress={() => void continueToDocumentation()} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Text style={styles.heading}>Dokumentasi</Text>
            <InputField name="findings" label="Temuan" multiline register={form.register} errors={form.formState.errors} />
            <InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} />
            <Pressable onPress={addPhoto} style={styles.photoButton}><Text style={styles.photoText}>Tambah Foto ({photos.length + storedPhotos.length}/3)</Text></Pressable>
            {photos.length ? <View style={styles.photos}>{photos.map((photo) => <Image alt="Foto pemeriksaan" key={photo.uri} source={{ uri: photo.uri }} style={styles.photo} />)}</View> : null}
            <View style={styles.actions}><SubmitButton label="Kembali" loading={saving} onPress={() => setStep(0)} /><SubmitButton label="Tinjau Pemeriksaan" loading={saving} onPress={() => setStep(2)} /></View>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text style={styles.heading}>Tinjau Sebelum Kirim</Text>
            <Summary label="Blok" value={(blocks.data?.blocks ?? []).find((block) => block.id === values.blockId)?.name ?? "Belum dipilih"} />
            <Summary label="Kondisi" value={`${values.condition} · Jalan ${values.conditionRoad} · Lingkungan ${values.conditionEnvironment} · Aktivitas ${values.conditionActivity}`} />
            <Summary label="Sumber daya" value={`${values.excavatorCount} alat berat · ${values.workerCount} pekerja`} />
            <Summary label="Lokasi GPS" value={capturedLocation ? `${capturedLocation.latitude.toFixed(6)}, ${capturedLocation.longitude.toFixed(6)}` : "Belum diambil"} />
            <Summary label="Dokumentasi" value={`${photos.length + storedPhotos.length} foto · ${values.findings || "Tidak ada temuan"}`} />
            <View style={styles.actions}><SubmitButton label="Kembali" loading={saving} onPress={() => setStep(1)} /><SubmitButton label="Simpan Draf" loading={saving} onPress={() => void form.handleSubmit((payload) => save(payload, "draft"))()} /><SubmitButton label="Kirim Data" loading={saving} onPress={() => void form.handleSubmit((payload) => save(payload, "submit"))()} /></View>
          </>
        ) : null}
      </Screen>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <View style={styles.summary}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ steps: { flexDirection: "row", gap: 6 }, step: { borderColor: colors.border, borderRadius: 9, borderWidth: 1, flex: 1, padding: 9 }, stepActive: { backgroundColor: "#EAF1FF", borderColor: colors.primary }, stepText: { color: colors.textMuted, fontSize: 10, fontWeight: "800", textAlign: "center" }, stepTextActive: { color: colors.primary }, heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, photoButton: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, padding: 13 }, photoText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, photos: { flexDirection: "row", gap: spacing.sm }, photo: { borderRadius: 8, height: 64, width: 64 }, actions: { gap: spacing.sm }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 4, padding: spacing.md }, summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, summaryValue: { color: colors.text, fontSize: 12, lineHeight: 18 } });
