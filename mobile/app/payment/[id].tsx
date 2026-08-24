import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Image, Pressable, StyleSheet, Text } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { createDuePaymentUploadUrl, getDue, recordDuePayment } from "../../src/lib/api";
import { money } from "../../src/lib/format";
import { numberValue, text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";

const schema = z.object({ payerName: z.string().trim().min(1).max(160), paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amount: z.coerce.number().int().positive(), method: z.enum(["CASH", "BANK_TRANSFER", "OTHER"]), notes: z.string().max(5000).optional() });
type Values = z.infer<typeof schema>;

export default function PaymentForm() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [paymentId] = useState(() => crypto.randomUUID()); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const query = useQuery({ queryKey: ["due", id], queryFn: () => getDue(String(id)), enabled: Boolean(role && id) }); const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { paymentDate: new Date().toISOString().slice(0, 10), method: "BANK_TRANSFER" } });
  if (!role) return null;
  const due = (query.data?.due as { item?: Record<string, unknown> } | undefined)?.item; const remaining = Math.max(0, numberValue(due, "amountDue") - numberValue(due, "amountPaid"));
  async function chooseEvidence() { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert("Izin diperlukan", "Izinkan galeri untuk melampirkan bukti pembayaran."); const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 }); if (!result.canceled) setEvidence(result.assets[0] ?? null); }
  async function uploadEvidence() { if (!evidence) return undefined; const size = evidence.fileSize ?? 0; if (!size) throw new Error("Ukuran bukti tidak tersedia."); const contentType = evidence.mimeType ?? "image/jpeg"; const upload = await createDuePaymentUploadUrl({ dueId: id, paymentId, contentType, size, originalName: evidence.fileName ?? `pembayaran-${Date.now()}.jpg` }); const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: await (await fetch(evidence.uri)).blob() }); if (!response.ok) throw new Error("Unggah bukti pembayaran gagal."); return upload.key; }
  async function submit(values: Values) { setSaving(true); try { const evidenceKey = await uploadEvidence(); await recordDuePayment({ ...values, evidenceKey, dueId: id, idempotencyKey: paymentId }); Alert.alert("Berhasil", "Pembayaran berhasil dicatat.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Catat Pembayaran" subtitle={text(due, "referenceKey", "Iuran")} /><Screen><Text style={styles.balance}>Sisa tagihan: {money(remaining)}</Text><InputField name="payerName" label="Nama pembayar" register={form.register} errors={form.formState.errors} /><DateField name="paymentDate" label="Tanggal pembayaran" control={form.control} errors={form.formState.errors} required /><InputField name="amount" label="Jumlah pembayaran" keyboardType="numeric" register={form.register} errors={form.formState.errors} placeholder={String(remaining)} /><SelectField label="Metode" value={form.watch("method")} options={[{ label: "Tunai", value: "CASH" }, { label: "Transfer", value: "BANK_TRANSFER" }, { label: "Lainnya", value: "OTHER" }]} onChange={(value) => form.setValue("method", value as Values["method"], { shouldValidate: true })} /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} /><Pressable onPress={() => void chooseEvidence()} style={styles.evidence}><Text style={styles.evidenceText}>{evidence ? "Ganti bukti pembayaran" : "Tambah bukti pembayaran"}</Text></Pressable>{evidence ? <Image source={{ uri: evidence.uri }} style={styles.preview} /> : null}<SubmitButton label="Simpan Pembayaran" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ balance: { color: colors.finance, fontSize: 15, fontWeight: "900", marginBottom: spacing.md }, evidence: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, padding: 13 }, evidenceText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, preview: { borderRadius: 10, height: 120, width: 120 } });
