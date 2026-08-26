import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, StyleSheet, Text } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { dueFormSchema as schema } from "../../src/form-schemas";
import { createDue, getExcavators } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

type Values = z.infer<typeof schema>;

export default function NewMonthlyDue() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const periodKey = new Date().toISOString().slice(0, 7);
  const units = useQuery({ queryKey: ["excavators", "due-form"], queryFn: () => getExcavators(), enabled: Boolean(role) });
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { dueDate: `${periodKey}-01`, amountDue: 10_000_000 } });
  if (!role) return null;
  async function submit(values: Values) { setSaving(true); try { await createDue({ ...values, dueType: "MONTHLY", referenceKey: periodKey }); Alert.alert("Tersimpan", "Iuran bulanan berhasil dibuat.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data iuran."); } finally { setSaving(false); } }
  const options = (units.data?.excavators ?? []).filter((item) => item.currentBlockId).map((item) => ({ label: `${String(item.unitCode)} · ${String(item.operatorName ?? "Tanpa operator")}`, value: String(item.id) }));
  return <><Header role={role} title="Iuran Bulanan Baru" subtitle={`Periode ${periodKey}`} /><Screen><Text style={styles.heading}>Tagihan Unit Excavator</Text><SelectField label="Unit excavator" required error={form.formState.errors.excavatorId?.message} value={form.watch("excavatorId") ?? ""} options={options} onChange={(value) => form.setValue("excavatorId", value, { shouldValidate: true })} /><InputField name="payerName" label="Nama pembayar" required register={form.register} errors={form.formState.errors} /><InputField name="amountDue" label="Jumlah tagihan" required keyboardType="numeric" register={form.register} errors={form.formState.errors} /><DateField name="dueDate" label="Jatuh tempo" control={form.control} errors={form.formState.errors} required /><SubmitButton label="Simpan Iuran Bulanan" loading={saving || units.isLoading} loadingLabel={units.isLoading ? "Memuat unit…" : "Menyimpan…"} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm } });
