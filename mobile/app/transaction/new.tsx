import { showActionError } from "../../src/lib/feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Image, StyleSheet } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, FormGrid, FormGridItem, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { FormSection } from "../../src/components/OperationalPrimitives";
import { transactionFormSchema as schema } from "../../src/form-schemas";
import { createFinancialTransaction, createFinancialTransactionUploadUrl, getFinanceCategories } from "../../src/lib/api";
import { text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";
import { optimizeImage, pickImagesFromCameraOrLibrary, uploadOptimizedImage } from "../../src/lib/media";
import { createClientId } from "../../src/lib/id";
import { Button, ButtonText } from "../../src/components/ui/button";

type Values = z.infer<typeof schema>;

export default function NewTransaction() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [transactionId] = useState(createClientId); const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { transactionAt: new Date().toISOString().slice(0, 10), transactionType: "CASH_OUT" } });
  const type = form.watch("transactionType"); const categories = useQuery({ queryKey: ["finance-categories", type], queryFn: () => getFinanceCategories({ transactionType: type }), enabled: Boolean(role) });
  if (!role) return null;
  async function chooseEvidence() { const selected = await pickImagesFromCameraOrLibrary({ title: "Bukti transaksi", cameraPermissionMessage: "Izinkan kamera untuk mengambil bukti transaksi.", libraryPermissionMessage: "Izinkan galeri untuk memilih bukti transaksi." }); setEvidence(selected[0] ?? null); }
  async function uploadEvidence() { if (!evidence) return undefined; const image = await optimizeImage(evidence, `transaksi-${Date.now()}`); const upload = await createFinancialTransactionUploadUrl({ transactionId, contentType: image.contentType, size: image.sizeBytes, originalName: image.name }); await uploadOptimizedImage(upload.uploadUrl, image); return upload.key; }
  async function submit(values: Values) { setSaving(true); try { const evidenceKey = await uploadEvidence(); await createFinancialTransaction({ ...values, categoryId: values.categoryId || undefined, evidenceKey, transactionAt: new Date(`${values.transactionAt}T12:00:00.000Z`).toISOString(), idempotencyKey: transactionId }); Alert.alert("Tersimpan", "Transaksi dibuat sebagai draf dan menunggu persetujuan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { showActionError(error, "Periksa data transaksi."); } finally { setSaving(false); } }
  return <><Header role={role} title="Catat Transaksi" subtitle="Pemasukan atau pengeluaran kas" /><Screen><FormSection title="Data transaksi" optional={false}><FormGrid><FormGridItem><DateField name="transactionAt" label="Tanggal transaksi" control={form.control} errors={form.formState.errors} required /></FormGridItem><FormGridItem><SelectField label="Jenis transaksi" required error={form.formState.errors.transactionType?.message} value={type} options={[{ label: "Pemasukan", value: "CASH_IN" }, { label: "Pengeluaran", value: "CASH_OUT" }]} onChange={(value) => { form.setValue("transactionType", value as Values["transactionType"], { shouldValidate: true }); form.setValue("categoryId", undefined); }} /></FormGridItem></FormGrid><SelectField label="Kategori" error={form.formState.errors.categoryId?.message} value={form.watch("categoryId") ?? ""} options={(categories.data?.categories ?? []).map((category) => ({ label: text(category, "name"), value: text(category, "id") }))} onChange={(value) => form.setValue("categoryId", value, { shouldValidate: true })} /><InputField name="amount" label="Jumlah" required keyboardType="numeric" control={form.control} currency register={form.register} errors={form.formState.errors} placeholder="Contoh: 250.000" /><InputField name="description" label="Uraian transaksi" required multiline register={form.register} errors={form.formState.errors} placeholder="Contoh: Pembelian bahan bakar" /></FormSection><FormSection title="Bukti transaksi" description="Lampirkan bukti jika tersedia."><Button accessibilityLabel={evidence ? "Ganti bukti transaksi" : "Tambah bukti transaksi"} onPress={() => void chooseEvidence()} variant="outline" className="min-h-11 self-start rounded-xl border-[#D9E1EE] bg-white px-3"><ButtonText className="text-xs font-extrabold text-[#1454C4]">{evidence ? "Ganti bukti transaksi" : "Tambah bukti transaksi"}</ButtonText></Button>{evidence ? <Image accessibilityLabel="Pratinjau bukti transaksi" source={{ uri: evidence.uri }} style={styles.preview} /> : null}</FormSection><SubmitButton label="Simpan Draf Transaksi" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, preview: { borderRadius: 10, height: 120, width: 120 } });
