import { showActionError } from "../../src/lib/feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import type { ImagePickerAsset } from "expo-image-picker";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { ImagePickerField } from "../../src/components/ImagePickerField";
import { addBlockPhoto, createBlock, createBlockPhotoUploadUrl } from "../../src/lib/api";
import { optimizeImage, uploadOptimizedImage } from "../../src/lib/media";
import { colors, spacing } from "../../src/theme";
import { getCurrentLocation } from "../../src/lib/location";
import { blockFormSchema, type BlockFormValues } from "../../src/block-form-schema";

type BlockFormInput = z.input<typeof blockFormSchema>;

function suggestedBlockCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `BLK-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function NewBlock() {
  const { role } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const form = useForm<BlockFormInput, unknown, BlockFormValues>({
    resolver: zodResolver(blockFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { code: suggestedBlockCode(), name: "", status: "NOT_OPERATING", priority: "NORMAL", latitude: undefined, longitude: undefined, areaHectares: undefined, managerName: "", locationPicName: "", fieldPicName: "", contact: "", workerCount: 0, operationalCondition: "", startDate: "", notes: "" },
  });

  if (!role) return null;

  async function captureLocation() {
    try {
      const location = await getCurrentLocation("mengisi latitude dan longitude");
      form.setValue("latitude", location.coords.latitude, { shouldDirty: true, shouldValidate: true });
      form.setValue("longitude", location.coords.longitude, { shouldDirty: true, shouldValidate: true });
      Alert.alert("Lokasi berhasil", "Latitude dan longitude sudah diisi dari lokasi perangkat.");
    } catch (error) {
      showActionError(error, "Lokasi belum dapat dibaca. Anda juga dapat mengisi latitude dan longitude secara manual.");
    }
  }

  async function onSubmit(values: BlockFormValues) {
    setSaving(true);
    try {
      const created = await createBlock({ ...values, startDate: values.startDate || undefined, areaHectares: values.areaHectares ?? undefined });
      const selected = photos[0];
      if (selected) {
        const image = await optimizeImage(selected, `blok-${created.id}`);
        const upload = await createBlockPhotoUploadUrl({ blockId: created.id, contentType: image.contentType, sizeBytes: image.sizeBytes, originalName: image.name });
        await uploadOptimizedImage(upload.uploadUrl, image);
        await addBlockPhoto({ blockId: created.id, storageKey: upload.key, contentType: image.contentType, sizeBytes: image.sizeBytes, caption: "Foto utama blok" });
      }
      Alert.alert("Berhasil", "Blok berhasil dibuat.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      showActionError(error, "Periksa data dan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return <><Header role={role} title="Tambah Blok" subtitle="Input data blok operasional" /><Screen><Text style={styles.heading}>Informasi Blok</Text><InputField name="code" label="Kode blok (otomatis, dapat diubah)" required register={form.register} errors={form.formState.errors} placeholder="BLK-001" /><InputField name="name" label="Nama blok" required register={form.register} errors={form.formState.errors} placeholder="Contoh: Blok Utara" /><ImagePickerField label="Foto blok" assets={photos} max={1} onChange={setPhotos} /><SelectField label="Status" value={form.watch("status")} onChange={(value) => form.setValue("status", value as BlockFormValues["status"], { shouldValidate: true })} options={[{ label: "Aktif", value: "ACTIVE" }, { label: "Berhenti", value: "STOPPED" }, { label: "Belum Operasi", value: "NOT_OPERATING" }]} /><SelectField label="Prioritas" value={form.watch("priority")} onChange={(value) => form.setValue("priority", value as BlockFormValues["priority"], { shouldValidate: true })} options={[{ label: "Rendah", value: "LOW" }, { label: "Normal", value: "NORMAL" }, { label: "Tinggi", value: "HIGH" }, { label: "Kritis", value: "CRITICAL" }]} /><InputField name="latitude" label="Latitude" required keyboardType="numeric" register={form.register} errors={form.formState.errors} placeholder="Otomatis dari lokasi atau contoh -6.2000000" /><InputField name="longitude" label="Longitude" required keyboardType="numeric" register={form.register} errors={form.formState.errors} placeholder="Otomatis dari lokasi atau contoh 106.8166667" /><Pressable accessibilityRole="button" onPress={() => void captureLocation()} style={styles.location}><Text style={styles.locationText}>Gunakan Lokasi Saat Ini</Text></Pressable><InputField name="areaHectares" label="Luas area (hektar)" keyboardType="numeric" register={form.register} errors={form.formState.errors} placeholder="Opsional" /><DateField name="startDate" label="Tanggal mulai operasi" control={form.control} errors={form.formState.errors} /><InputField name="managerName" label="Pengelola" register={form.register} errors={form.formState.errors} placeholder="Opsional" /><InputField name="locationPicName" label="PJ lokasi" register={form.register} errors={form.formState.errors} placeholder="Opsional" /><InputField name="fieldPicName" label="PJ lapangan" register={form.register} errors={form.formState.errors} placeholder="Opsional" /><InputField name="contact" label="Kontak" register={form.register} errors={form.formState.errors} placeholder="Opsional" /><InputField name="workerCount" label="Jumlah pekerja" keyboardType="numeric" register={form.register} errors={form.formState.errors} placeholder="0" /><InputField name="operationalCondition" label="Kondisi operasional" required multiline register={form.register} errors={form.formState.errors} placeholder="Contoh: Beroperasi normal; akses jalan aman." /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} placeholder="Opsional" /><SubmitButton label="Simpan Blok" loading={saving} onPress={() => void form.handleSubmit(onSubmit)()} /></Screen></>;
}

const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, location: { alignItems: "center", borderColor: colors.primary, borderRadius: 9, borderWidth: 1, padding: 11 }, locationText: { color: colors.primary, fontSize: 11, fontWeight: "900" } });
