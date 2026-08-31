import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { ErrorState, Header, InlineError, LoadingState, Screen } from "../../src/components/Screen";
import { DateField, InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { dueFormSchema as schema } from "../../src/form-schemas";
import { createDue, getDueCreationConfig, getExcavators } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

type Values = z.infer<typeof schema>;

export default function NewMonthlyDue() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState<unknown>(null); const periodKey = new Date().toISOString().slice(0, 7);
  const units = useQuery({ queryKey: ["excavators", "due-form"], queryFn: () => getExcavators(), enabled: Boolean(role) });
  const dueConfig = useQuery({ queryKey: ["due-creation-config"], queryFn: getDueCreationConfig, enabled: Boolean(role), retry: false });
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { dueDate: `${periodKey}-01`, amountDue: 10_000_000 } });
  const configuredAmount = dueConfig.data?.monthlyDueAmount;
  useEffect(() => { if (configuredAmount && !form.getFieldState("amountDue").isDirty) form.setValue("amountDue", configuredAmount, { shouldValidate: true }); }, [configuredAmount, form]);
  if (!role) return null;
  if (dueConfig.isLoading) return <><Header role={role} title="Iuran Bulanan Baru" subtitle={`Periode ${periodKey}`} /><Screen><LoadingState /></Screen></>;
  if (dueConfig.isError || !dueConfig.data) return <><Header role={role} title="Iuran Bulanan Baru" subtitle={`Periode ${periodKey}`} /><Screen><ErrorState message="Pengaturan nominal iuran tidak dapat dimuat." error={dueConfig.error} onRetry={() => dueConfig.refetch()} /></Screen></>;
  async function submit(values: Values) { setSaveError(null); setSaving(true); try { await createDue({ ...values, dueType: "MONTHLY", referenceKey: periodKey }); Alert.alert("Tersimpan", "Iuran bulanan berhasil dibuat.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { setSaveError(error); } finally { setSaving(false); } }
  const options = (units.data?.excavators ?? []).filter((item) => item.currentBlockId).map((item) => ({ label: `${String(item.unitCode)} · ${String(item.operatorName ?? "Tanpa operator")}`, value: String(item.id) }));
  return <><Header role={role} title="Iuran Bulanan Baru" subtitle={`Periode ${periodKey}`} /><Screen><Text style={styles.heading}>Tagihan Unit Alat Berat</Text>{saveError ? <InlineError message="Iuran tidak dapat disimpan." error={saveError} /> : null}<SelectField label="Unit alat berat" required error={form.formState.errors.excavatorId?.message} value={form.watch("excavatorId") ?? ""} options={options} onChange={(value) => form.setValue("excavatorId", value, { shouldValidate: true })} /><InputField name="payerName" label="Nama pembayar" required register={form.register} errors={form.formState.errors} /><InputField name="amountDue" label="Jumlah tagihan" required keyboardType="numeric" control={form.control} currency register={form.register} errors={form.formState.errors} helper={`Mengikuti pengaturan server: Rp${dueConfig.data.monthlyDueAmount.toLocaleString("id-ID")}`} /><DateField name="dueDate" label="Jatuh tempo" control={form.control} errors={form.formState.errors} required /><SubmitButton label="Simpan Iuran Bulanan" loading={saving || units.isLoading} loadingLabel={units.isLoading ? "Memuat unit…" : "Menyimpan…"} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm } });
