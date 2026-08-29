import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";
import { useAuth } from "../../src/auth";
import { Header, Screen } from "../../src/components/Screen";
import { InputField, MonthField, SubmitButton } from "../../src/components/NativeForm";
import { budgetPeriodFormSchema as schema } from "../../src/form-schemas";
import { workflow } from "../../src/lib/api";
import { text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";
type Values = z.infer<typeof schema>;
export default function NewBudget() { const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false); const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { periodKey: nextPeriodKey(), openingBalance: 0, estimatedIncome: 0 } }); if (!role) return null; async function submit(v: Values) { setSaving(true); try { const created = await workflow<Record<string, unknown>>("createBudgetPeriod", v); const id = text(created, "id"); if (id) router.replace(`/budget/${id}`); else router.back(); } catch (e) { Alert.alert("Tidak dapat menyimpan", e instanceof Error ? e.message : "Periksa data."); } finally { setSaving(false); } } return <><Header role={role} title="Rencana Anggaran Baru" subtitle="Rencanakan kebutuhan periode berikutnya" /><Screen><Text style={styles.heading}>Data Rencana Anggaran</Text><Text style={styles.help}>Setelah periode dibuat, tambahkan item pengeluaran, kategori, nilai, tujuan penggunaan, dan lampiran sebelum diajukan untuk verifikasi serta persetujuan Pimpinan.</Text><MonthField name="periodKey" label="Periode anggaran" control={form.control} errors={form.formState.errors} /><InputField name="openingBalance" label="Saldo awal" required keyboardType="numeric" register={form.register} errors={form.formState.errors} /><InputField name="estimatedIncome" label="Pendapatan estimasi" required keyboardType="numeric" register={form.register} errors={form.formState.errors} /><SubmitButton label="Buat Rencana Anggaran" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>; }
function nextPeriodKey() { const date = new Date(); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 7); }
const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm }, help: { color: colors.textMuted, fontSize: 11, lineHeight: 16 } });
