import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { ImagePickerField } from "../../src/components/ImagePickerField";
import { Header, Screen } from "../../src/components/Screen";
import { createDuePaymentVerificationUploadUrl, verifyDuePayment } from "../../src/lib/api";
import { optimizeImage, uploadOptimizedImage } from "../../src/lib/media";

const schema = z.object({ verificationStatus: z.enum(["CONFIRMED", "DISCREPANCY"]), verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().max(5000).optional() }).superRefine((values, context) => { if (values.verificationStatus === "DISCREPANCY" && !values.notes?.trim()) context.addIssue({ code: "custom", path: ["notes"], message: "Catatan wajib untuk selisih." }); });
type Values = z.infer<typeof schema>;

export default function VerifyPayment() {
  const { duePaymentId } = useLocalSearchParams<{ duePaymentId: string }>(); const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset[]>([]); const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { verificationStatus: "CONFIRMED", verifiedAt: new Date().toISOString().slice(0, 10) } });
  if (!role) return null;
  async function uploadEvidence() { const selected = evidence[0]; if (!selected) return undefined; const image = await optimizeImage(selected, `verifikasi-${duePaymentId}`); const upload = await createDuePaymentVerificationUploadUrl({ duePaymentId, contentType: image.contentType, size: image.sizeBytes, originalName: image.name }); await uploadOptimizedImage(upload.uploadUrl, image); return upload.key; }
  async function submit(values: Values) { setSaving(true); try { const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== "granted") throw new Error("Izin lokasi diperlukan untuk verifikasi lapangan."); const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); const evidenceKey = await uploadEvidence(); await verifyDuePayment({ duePaymentId, verificationStatus: values.verificationStatus, verifiedAt: new Date(`${values.verifiedAt}T12:00:00.000Z`).toISOString(), evidenceKey, notes: values.notes, latitude: location.coords.latitude, longitude: location.coords.longitude, gpsAccuracy: location.coords.accuracy ?? 0 }); Alert.alert("Berhasil", "Verifikasi pembayaran tersimpan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Verifikasi Iuran" subtitle="Konfirmasi setoran di lapangan" /><Screen><SelectField label="Hasil verifikasi" value={form.watch("verificationStatus")} options={[{ label: "Sesuai", value: "CONFIRMED" }, { label: "Ada selisih", value: "DISCREPANCY" }]} onChange={(value) => form.setValue("verificationStatus", value as Values["verificationStatus"], { shouldValidate: true })} /><DateField name="verifiedAt" label="Tanggal verifikasi" control={form.control} errors={form.formState.errors} required /><InputField name="notes" label="Catatan lapangan" multiline register={form.register} errors={form.formState.errors} /><ImagePickerField label="Bukti verifikasi" assets={evidence} max={1} onChange={setEvidence} /><SubmitButton label="Simpan Verifikasi" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
