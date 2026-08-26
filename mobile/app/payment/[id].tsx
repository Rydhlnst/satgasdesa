import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Image, Pressable, StyleSheet, Text } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { paymentFormSchema as schema } from "../../src/form-schemas";
import { createDuePaymentUploadUrl, getDue, recordDuePayment } from "../../src/lib/api";
import { money } from "../../src/lib/format";
import { numberValue, text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";
import { pickImagesFromCameraOrLibrary } from "../../src/lib/media";

type Values = z.infer<typeof schema>;

export default function PaymentForm() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [paymentId] = useState(() => crypto.randomUUID()); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const query = useQuery({ queryKey: ["due", id], queryFn: () => getDue(String(id)), enabled: Boolean(role && id) }); const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { paymentDate: new Date().toISOString().slice(0, 10), method: "BANK_TRANSFER" } });
  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Catat Pembayaran" /><Screen><Text>Memuat data tagihan…</Text></Screen></>;
  if (query.isError || !query.data) return <><Header role={role} title="Catat Pembayaran" /><Screen><Text>Data tagihan tidak dapat dimuat. Kembali dan coba lagi.</Text></Screen></>;
  const due = (query.data?.due as { item?: Record<string, unknown> } | undefined)?.item; const remaining = Math.max(0, numberValue(due, "amountDue") - numberValue(due, "amountPaid"));
  async function chooseEvidence() { const selected = await pickImagesFromCameraOrLibrary({ title: "Bukti pembayaran", cameraPermissionMessage: "Izinkan kamera untuk mengambil bukti pembayaran.", libraryPermissionMessage: "Izinkan galeri untuk memilih bukti pembayaran." }); setEvidence(selected[0] ?? null); }
  async function uploadEvidence() { if (!evidence) return undefined; const size = evidence.fileSize ?? 0; if (!size) throw new Error("Ukuran bukti tidak tersedia."); if (size > 10 * 1024 * 1024) throw new Error("Bukti pembayaran maksimal 10 MB."); const contentType = evidence.mimeType ?? "image/jpeg"; const upload = await createDuePaymentUploadUrl({ dueId: id, paymentId, contentType, size, originalName: evidence.fileName ?? `pembayaran-${Date.now()}.jpg` }); const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: await (await fetch(evidence.uri)).blob() }); if (!response.ok) throw new Error("Unggah bukti pembayaran gagal."); return upload.key; }
  async function submit(values: Values) { setSaving(true); try { const evidenceKey = await uploadEvidence(); await recordDuePayment({ ...values, evidenceKey, dueId: id, idempotencyKey: paymentId }); Alert.alert("Berhasil", "Pembayaran berhasil dicatat.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Catat Pembayaran" subtitle={text(due, "referenceKey", "Iuran")} /><Screen><Text style={styles.balance}>Sisa tagihan: {money(remaining)}</Text><InputField name="payerName" label="Nama pembayar" required register={form.register} errors={form.formState.errors} /><DateField name="paymentDate" label="Tanggal pembayaran" control={form.control} errors={form.formState.errors} required /><InputField name="amount" label="Jumlah pembayaran" required keyboardType="numeric" register={form.register} errors={form.formState.errors} placeholder={String(remaining)} /><SelectField label="Metode" required error={form.formState.errors.method?.message} value={form.watch("method")} options={[{ label: "Tunai", value: "CASH" }, { label: "Transfer", value: "BANK_TRANSFER" }, { label: "QRIS", value: "QRIS" }, { label: "Lainnya", value: "OTHER" }]} onChange={(value) => form.setValue("method", value as Values["method"], { shouldValidate: true })} /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} /><Pressable onPress={() => void chooseEvidence()} style={styles.evidence}><Text style={styles.evidenceText}>{evidence ? "Ganti bukti pembayaran" : "Tambah bukti pembayaran"}</Text></Pressable>{evidence ? <Image source={{ uri: evidence.uri }} style={styles.preview} /> : null}<SubmitButton label="Simpan Pembayaran" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ balance: { color: colors.finance, fontSize: 15, fontWeight: "900", marginBottom: spacing.md }, evidence: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, padding: 13 }, evidenceText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, preview: { borderRadius: 10, height: 120, width: 120 } });
