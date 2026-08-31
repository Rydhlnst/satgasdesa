import { showActionError } from "../../src/lib/feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { CapturedLocation, DateField, InputField, LocationField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { ImagePickerField } from "../../src/components/ImagePickerField";
import { Header, Screen } from "../../src/components/Screen";
import { paymentVerificationFormSchema as schema } from "../../src/form-schemas";
import { createDuePaymentVerificationUploadUrl, verifyDuePayment } from "../../src/lib/api";
import { optimizeImage, uploadOptimizedImage } from "../../src/lib/media";
import { getCurrentLocation } from "../../src/lib/location";
import { routeParam } from "../../src/lib/id";

type Values = z.infer<typeof schema>;

export default function VerifyPayment() {
  const params = useLocalSearchParams<{ duePaymentId?: string | string[] }>(); const duePaymentId = routeParam(params.duePaymentId); const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [locationLoading, setLocationLoading] = useState(false); const [capturedLocation, setCapturedLocation] = useState<CapturedLocation | null>(null); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset[]>([]); const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { verificationStatus: "CONFIRMED", verifiedAt: new Date().toISOString().slice(0, 10) } });
  if (!role) return null;
  async function uploadEvidence() { const selected = evidence[0]; if (!selected) return undefined; const image = await optimizeImage(selected, `verifikasi-${duePaymentId}`); const upload = await createDuePaymentVerificationUploadUrl({ duePaymentId, contentType: image.contentType, size: image.sizeBytes, originalName: image.name }); await uploadOptimizedImage(upload.uploadUrl, image); return upload.key; }
  async function captureLocation() { setLocationLoading(true); try { const result = await getCurrentLocation("verifikasi lapangan"); const next = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy, capturedAt: new Date().toISOString() }; setCapturedLocation(next); return next; } catch (error) { showActionError(error, "Lokasi perangkat belum dapat dibaca."); throw error; } finally { setLocationLoading(false); } }
  async function submit(values: Values) { setSaving(true); try { const location = capturedLocation ?? await captureLocation(); const evidenceKey = await uploadEvidence(); await verifyDuePayment({ duePaymentId, verificationStatus: values.verificationStatus, verifiedAt: new Date(`${values.verifiedAt}T12:00:00.000Z`).toISOString(), evidenceKey, notes: values.notes, latitude: location.latitude, longitude: location.longitude, gpsAccuracy: location.accuracy ?? 0 }); Alert.alert("Berhasil", "Verifikasi pembayaran tersimpan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { showActionError(error, "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Verifikasi Iuran" subtitle="Konfirmasi setoran di lapangan" /><Screen><SelectField label="Hasil verifikasi" required error={form.formState.errors.verificationStatus?.message} value={form.watch("verificationStatus")} options={[{ label: "Sesuai", value: "CONFIRMED" }, { label: "Ada selisih", value: "DISCREPANCY" }]} onChange={(value) => form.setValue("verificationStatus", value as Values["verificationStatus"], { shouldValidate: true })} /><DateField name="verifiedAt" label="Tanggal verifikasi" control={form.control} errors={form.formState.errors} required /><InputField name="notes" label="Catatan lapangan" multiline register={form.register} errors={form.formState.errors} /><LocationField value={capturedLocation} loading={locationLoading} onCapture={captureLocation} /><ImagePickerField label="Bukti verifikasi" assets={evidence} max={1} onChange={setEvidence} /><SubmitButton label="Simpan Verifikasi" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
