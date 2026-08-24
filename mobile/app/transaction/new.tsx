import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Image, Pressable, StyleSheet, Text } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { createFinancialTransaction, createFinancialTransactionUploadUrl, getFinanceCategories } from "../../src/lib/api";
import { text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";

const schema = z.object({ transactionAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), transactionType: z.enum(["CASH_IN", "CASH_OUT"]), categoryId: z.string().uuid("Pilih kategori.").optional(), amount: z.coerce.number().int().positive(), description: z.string().trim().min(1).max(10000) });
type Values = z.infer<typeof schema>;

export default function NewTransaction() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [transactionId] = useState(() => crypto.randomUUID()); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { transactionAt: new Date().toISOString().slice(0, 10), transactionType: "CASH_OUT" } });
  const type = form.watch("transactionType"); const categories = useQuery({ queryKey: ["finance-categories", type], queryFn: () => getFinanceCategories({ transactionType: type }), enabled: Boolean(role) });
  if (!role) return null;
  async function chooseEvidence() { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert("Izin diperlukan", "Izinkan galeri untuk melampirkan bukti transaksi."); const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 }); if (!result.canceled) setEvidence(result.assets[0] ?? null); }
  async function uploadEvidence() { if (!evidence) return undefined; const size = evidence.fileSize ?? 0; if (!size) throw new Error("Ukuran bukti tidak tersedia."); const contentType = evidence.mimeType ?? "image/jpeg"; const upload = await createFinancialTransactionUploadUrl({ transactionId, contentType, size, originalName: evidence.fileName ?? `transaksi-${Date.now()}.jpg` }); const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: await (await fetch(evidence.uri)).blob() }); if (!response.ok) throw new Error("Unggah bukti transaksi gagal."); return upload.key; }
  async function submit(values: Values) { setSaving(true); try { const evidenceKey = await uploadEvidence(); await createFinancialTransaction({ ...values, categoryId: values.categoryId || undefined, evidenceKey, transactionAt: new Date(`${values.transactionAt}T12:00:00.000Z`).toISOString(), idempotencyKey: transactionId }); Alert.alert("Tersimpan", "Transaksi dibuat sebagai DRAFT dan menunggu persetujuan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data transaksi."); } finally { setSaving(false); } }
  return <><Header role={role} title="Catat Transaksi" subtitle="Pemasukan atau pengeluaran kas" /><Screen><Text style={styles.heading}>Data Transaksi</Text><DateField name="transactionAt" label="Tanggal transaksi" control={form.control} errors={form.formState.errors} required /><SelectField label="Jenis transaksi" value={type} options={[{ label: "Pemasukan", value: "CASH_IN" }, { label: "Pengeluaran", value: "CASH_OUT" }]} onChange={(value) => { form.setValue("transactionType", value as Values["transactionType"], { shouldValidate: true }); form.setValue("categoryId", undefined); }} /><SelectField label="Kategori" value={form.watch("categoryId") ?? ""} options={(categories.data?.categories ?? []).map((category) => ({ label: text(category, "name"), value: text(category, "id") }))} onChange={(value) => form.setValue("categoryId", value, { shouldValidate: true })} /><InputField name="amount" label="Jumlah" keyboardType="numeric" register={form.register} errors={form.formState.errors} /><InputField name="description" label="Uraian transaksi" multiline register={form.register} errors={form.formState.errors} /><Pressable onPress={() => void chooseEvidence()} style={styles.evidence}><Text style={styles.evidenceText}>{evidence ? "Ganti bukti transaksi" : "Tambah bukti transaksi"}</Text></Pressable>{evidence ? <Image source={{ uri: evidence.uri }} style={styles.preview} /> : null}<SubmitButton label="Simpan Draft Transaksi" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, evidence: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, padding: 13 }, evidenceText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, preview: { borderRadius: 10, height: 120, width: 120 } });
