import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image, StyleSheet, Text } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { ErrorState, Header, LoadingState, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { paymentFormSchema as schema } from "../../src/form-schemas";
import { createDuePaymentUploadUrl, getDue, recordDuePayment } from "../../src/lib/api";
import { money } from "../../src/lib/format";
import { numberValue, text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";
import { optimizeImage, pickImagesFromCameraOrLibrary, uploadOptimizedImage } from "../../src/lib/media";
import { createClientId } from "../../src/lib/id";
import { isMonthlyPaymentDate } from "../../src/date-validation";
import { Button, ButtonText } from "../../src/components/ui/button";

type Values = z.infer<typeof schema>;

export default function PaymentForm() {
  const { id } = useLocalSearchParams<{ id: string }>(); const dueId = String(id ?? ""); const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [paymentId] = useState(createClientId); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const query = useQuery({ queryKey: ["due", dueId], queryFn: () => getDue(dueId), enabled: Boolean(role && dueId) }); const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { paymentDate: new Date().toISOString().slice(0, 10), method: "BANK_TRANSFER" } });
  const due = (query.data?.due as { item?: Record<string, unknown> } | undefined)?.item;
  const dueType = text(due, "dueType");
  const referenceKey = text(due, "referenceKey", "");
  const isMonthly = dueType === "MONTHLY";
  const remaining = Math.max(0, numberValue(due, "amountDue") - numberValue(due, "amountPaid"));
  useEffect(() => {
    if (!isMonthly || !/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceKey)) return;
    const current = form.getValues("paymentDate");
    if (!isMonthlyPaymentDate(current, referenceKey)) form.setValue("paymentDate", `${referenceKey}-10`, { shouldValidate: true });
  }, [form, isMonthly, referenceKey]);
  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Catat Pembayaran" /><Screen><LoadingState /></Screen></>;
  if (query.isError || !query.data) return <><Header role={role} title="Catat Pembayaran" /><Screen><ErrorState message="Data tagihan tidak dapat dimuat. Periksa koneksi, URL API, dan status redeploy Coolify." error={query.error} onRetry={() => query.refetch()} /></Screen></>;
  async function chooseEvidence() { const selected = await pickImagesFromCameraOrLibrary({ title: "Bukti pembayaran", cameraPermissionMessage: "Izinkan kamera untuk mengambil bukti pembayaran.", libraryPermissionMessage: "Izinkan galeri untuk memilih bukti pembayaran." }); setEvidence(selected[0] ?? null); }
  async function uploadEvidence() { if (!evidence) return undefined; const image = await optimizeImage(evidence, `pembayaran-${Date.now()}`); const upload = await createDuePaymentUploadUrl({ dueId, paymentId, contentType: image.contentType, size: image.sizeBytes, originalName: image.name }); await uploadOptimizedImage(upload.uploadUrl, image); return upload.key; }
  async function submit(values: Values) { if (isMonthly && !isMonthlyPaymentDate(values.paymentDate, referenceKey)) { form.setError("paymentDate", { type: "validate", message: `Iuran bulanan periode ${referenceKey || "ini"} hanya dapat dicatat pada tanggal 1–10.` }); return; } if (values.amount > remaining) { form.setError("amount", { type: "validate", message: `Jumlah pembayaran maksimal ${money(remaining)}.` }); return; } if (!evidence) { Alert.alert("Bukti pembayaran diperlukan", "Lampirkan foto atau bukti pembayaran sebelum menyimpan."); return; } setSaving(true); try { const evidenceKey = await uploadEvidence(); await recordDuePayment({ ...values, evidenceKey, dueId, idempotencyKey: paymentId }); Alert.alert("Menunggu konfirmasi", "Pembayaran dicatat sebagai pengajuan dan akan menjadi lunas setelah Bendahara mengonfirmasi penerimaan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Catat Pembayaran" subtitle={text(due, "referenceKey", "Iuran")} /><Screen><Text style={styles.balance}>Sisa tagihan: {money(remaining)}</Text><Text style={styles.helper}>Pembayaran tetap berstatus menunggu sampai Bendahara mengonfirmasi penerimaan. Nama pembayar, metode, catatan, dan bukti akan tersimpan dalam riwayat.</Text><InputField name="payerName" label="Nama pembayar" required register={form.register} errors={form.formState.errors} /><DateField name="paymentDate" label="Tanggal pembayaran" control={form.control} errors={form.formState.errors} required />{isMonthly ? <Text style={styles.fieldHint}>Iuran bulanan hanya dapat dicatat untuk periode {referenceKey} pada tanggal 1–10.</Text> : null}<InputField name="amount" label="Jumlah pembayaran" required keyboardType="numeric" control={form.control} currency register={form.register} errors={form.formState.errors} helper={`Maksimum ${money(remaining)}.`} placeholder={money(remaining)} /><SelectField label="Metode" required error={form.formState.errors.method?.message} value={form.watch("method")} options={[{ label: "Tunai", value: "CASH" }, { label: "Transfer", value: "BANK_TRANSFER" }, { label: "QRIS", value: "QRIS" }, { label: "Lainnya", value: "OTHER" }]} onChange={(value) => form.setValue("method", value as Values["method"], { shouldValidate: true })} /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} /><Button accessibilityLabel={evidence ? "Ganti bukti pembayaran" : "Tambah bukti pembayaran wajib"} onPress={() => void chooseEvidence()} variant="outline" className="min-h-11 self-start rounded-xl border-[#D9E1EE] bg-white px-3"><ButtonText className="text-xs font-extrabold text-[#1454C4]">{evidence ? "Ganti bukti pembayaran" : "Tambah bukti pembayaran (wajib)"}</ButtonText></Button>{evidence ? <Image accessibilityLabel="Pratinjau bukti pembayaran" source={{ uri: evidence.uri }} style={styles.preview} /> : null}<SubmitButton label="Simpan Pembayaran" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ balance: { color: colors.finance, fontSize: 15, fontWeight: "900", marginBottom: spacing.sm }, helper: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, fieldHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: -spacing.sm }, preview: { borderRadius: 10, height: 120, width: 120 } });
