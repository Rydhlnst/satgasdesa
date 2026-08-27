import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";
import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { InputField, SubmitButton } from "../../src/components/NativeForm";
import { budgetPeriodFormSchema as schema } from "../../src/form-schemas";
import { workflow } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";
type Values = z.infer<typeof schema>;
export default function NewBudget() { const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { periodKey: new Date().toISOString().slice(0, 7), openingBalance: 0, estimatedIncome: 0 } }); if (!role) return null; async function submit(v: Values) { setSaving(true); try { await workflow("createBudgetPeriod", v); Alert.alert("Berhasil", "Periode anggaran dibuat.", [{ text: "OK", onPress: () => router.back() }]); } catch (e) { Alert.alert("Tidak dapat menyimpan", e instanceof Error ? e.message : "Periksa data."); } finally { setSaving(false); } } return <><Header role={role} title="Periode Anggaran Baru" subtitle="Input periode dan sumber dana" /><Screen><Text style={styles.heading}>Data Anggaran</Text><InputField name="periodKey" label="Periode (YYYY-MM)" required register={form.register} errors={form.formState.errors} placeholder="2026-08" /><InputField name="openingBalance" label="Saldo awal" required keyboardType="numeric" register={form.register} errors={form.formState.errors} /><InputField name="estimatedIncome" label="Pendapatan estimasi" required keyboardType="numeric" register={form.register} errors={form.formState.errors} /><SubmitButton label="Simpan Periode" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>; }
const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm } });
