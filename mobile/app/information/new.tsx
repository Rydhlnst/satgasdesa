import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { ImagePickerAsset } from "expo-image-picker";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { ImagePickerField } from "../../src/components/ImagePickerField";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { informationFormSchema as schema } from "../../src/form-schemas";
import { createDailyInformation, createDailyInformationAttachmentUploadUrl, getBlocks } from "../../src/lib/api";
import { queueDailyInformationSubmission } from "../../src/offline/sync";
import { optimizeImage, uploadOptimizedImage } from "../../src/lib/media";
import { colors, spacing } from "../../src/theme";
import { getCurrentLocation } from "../../src/lib/location";
import { isRetryableNetworkError } from "../../src/lib/feedback";

type Values = z.infer<typeof schema>;

export default function NewInformation() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [photos, setPhotos] = useState<ImagePickerAsset[]>([]); const [informationId] = useState(() => crypto.randomUUID());
  const blocks = useQuery({ queryKey: ["blocks", "information-form"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { category: "ACTIVITY", priority: "MEDIUM", reportedAt: new Date().toISOString().slice(0, 10) } });
  if (!role) return null;
  async function submit(values: Values) {
    setSaving(true);
    try {
      const location = await getCurrentLocation("mengirim informasi lapangan");
      const input = { ...values, blockId: values.blockId || undefined, reportedAt: values.reportedAt || undefined, latitude: location.coords.latitude, longitude: location.coords.longitude, gpsAccuracy: location.coords.accuracy ?? 0, gpsCapturedAt: new Date().toISOString() };
      try {
        const attachments = await Promise.all(photos.map(async (photo) => {
          const image = await optimizeImage(photo, `informasi-${Date.now()}`);
          const upload = await createDailyInformationAttachmentUploadUrl({ id: informationId, contentType: image.contentType, sizeBytes: image.sizeBytes, originalName: image.name }) as { key: string; uploadUrl: string };
          await uploadOptimizedImage(upload.uploadUrl, image);
          return { storageKey: upload.key, contentType: image.contentType, sizeBytes: image.sizeBytes };
        }));
        await createDailyInformation({ id: informationId, ...input, attachments });
        Alert.alert("Berhasil", "Informasi harian berhasil dikirim.", [{ text: "OK", onPress: () => router.replace(`/information/${informationId}`) }]);
      } catch (error) {
        if (!isRetryableNetworkError(error)) throw error;
        await queueDailyInformationSubmission(informationId, input, photos);
        Alert.alert("Data diantrikan", "Informasi dan foto tersimpan aman di perangkat. Data akan dikirim otomatis saat koneksi kembali.", [{ text: "OK", onPress: () => router.replace("/information") }]);
      }
    } catch (error) {
      Alert.alert("Tidak dapat mengirim", error instanceof Error ? error.message : "Periksa data, lokasi, dan koneksi.");
    } finally {
      setSaving(false);
    }
  }
  return <><Header role={role} title="Informasi Harian Baru" subtitle="Kirim data lapangan" /><Screen><Text style={styles.heading}>Data Informasi</Text><SelectField label="Blok (opsional)" value={form.watch("blockId") ?? ""} options={[{ label: "Tanpa blok", value: "" }, ...(blocks.data?.blocks ?? []).map((block) => ({ label: `${block.code} · ${block.name}`, value: block.id }))]} onChange={(value) => form.setValue("blockId", value || undefined, { shouldValidate: true })} /><DateField name="reportedAt" label="Tanggal dan waktu laporan" control={form.control} errors={form.formState.errors} /><SelectField label="Jenis informasi" required error={form.formState.errors.category?.message} value={form.watch("category")} options={[{ label: "Kegiatan", value: "ACTIVITY" }, { label: "Keluhan", value: "COMPLAINT" }, { label: "Pemberitahuan", value: "NOTICE" }, { label: "Insiden", value: "INCIDENT" }, { label: "Calon pengelola", value: "PROSPECTIVE_MANAGER" }]} onChange={(value) => form.setValue("category", value as Values["category"], { shouldValidate: true })} /><SelectField label="Prioritas" required error={form.formState.errors.priority?.message} value={form.watch("priority")} options={[{ label: "Rendah", value: "LOW" }, { label: "Sedang", value: "MEDIUM" }, { label: "Tinggi", value: "HIGH" }, { label: "Mendesak", value: "URGENT" }]} onChange={(value) => form.setValue("priority", value as Values["priority"], { shouldValidate: true })} /><InputField name="description" label="Deskripsi" required multiline register={form.register} errors={form.formState.errors} /><InputField name="documentation" label="Catatan dokumentasi" multiline register={form.register} errors={form.formState.errors} /><ImagePickerField label="Foto dokumentasi" assets={photos} max={5} onChange={setPhotos} /><Text style={styles.gps}>GPS akan direkam saat data dikirim.</Text><SubmitButton label="Kirim Data" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}

const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, gps: { color: colors.textMuted, fontSize: 10 } });
