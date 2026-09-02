import { showActionError } from "../../src/lib/feedback";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { TextInput } from "../../src/components/AppPrimitives";

import { useAuth } from "../../src/auth";
import { BottomNav, ErrorState, Header, LoadingState, Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/PimpinanPrimitives";
import { Button, ButtonText } from "../../src/components/AppPrimitives";
import { approveFinancialTransaction, getFinancialTransactionEvidenceDownloadUrl, getTransaction, reverseFinancialTransaction } from "../../src/lib/api";
import { money } from "../../src/lib/format";
import { displayStatus, numberValue, text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";
import { reversalFormSchema, transactionApprovalFormSchema } from "../../src/form-schemas";

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { role, session } = useAuth(); const client = useQueryClient(); const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false);
  const query = useQuery({ queryKey: ["transaction", id], queryFn: () => getTransaction(id), enabled: Boolean(role && id) });
  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Detail Transaksi" /><Screen withBottomNav={false}><LoadingState /></Screen></>;
  if (query.isError || !query.data?.item) return <><Header role={role} title="Detail Transaksi" /><Screen withBottomNav={false}><ErrorState message="Transaksi tidak dapat dimuat." error={query.error} onRetry={() => query.refetch()} /></Screen></>;
  const item = query.data.item; const status = text(item, "status"); const canApprove = session?.permissions.includes("FINANCE_APPROVE");
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["transaction", id] }); await client.invalidateQueries({ queryKey: ["transactions"] }); };
  async function approve() { if (saving) return; const parsed = transactionApprovalFormSchema.safeParse({ id }); if (!parsed.success) return Alert.alert("Transaksi tidak valid", parsed.error.issues[0]?.message ?? "Muat ulang transaksi lalu coba lagi."); setSaving(true); try { await approveFinancialTransaction(parsed.data); await refresh(); } catch (error) { showActionError(error, "Coba lagi."); } finally { setSaving(false); } }
  async function reverse() { if (saving) return; const parsed = reversalFormSchema.safeParse({ reason }); if (!parsed.success) return Alert.alert("Alasan diperlukan", parsed.error.issues[0]?.message ?? "Masukkan alasan pembalikan transaksi."); setSaving(true); try { await reverseFinancialTransaction({ id, ...parsed.data }); setReason(""); await refresh(); } catch (error) { showActionError(error, "Periksa koneksi lalu coba lagi."); } finally { setSaving(false); } }
  async function openEvidence() { try { const result = await getFinancialTransactionEvidenceDownloadUrl({ id }); await Linking.openURL(result.downloadUrl); } catch (error) { showActionError(error, "Coba lagi."); } }
  return <><Header role={role} title="Detail Transaksi" subtitle={text(item, "transactionCode")} /><Screen><View style={styles.hero}><Text style={styles.label}>{text(item, "transactionType") === "CASH_IN" ? "PEMASUKAN" : "PENGELUARAN"}</Text><Text style={styles.amount}>{money(numberValue(item, "amount"))}</Text><StatusPill tone={status === "SAH" ? "green" : status === "REVERSED" ? "gray" : "orange"}>{displayStatus(status)}</StatusPill></View><View style={styles.card}><Text style={styles.label}>Uraian</Text><Text style={styles.value}>{text(item, "description")}</Text><Text style={styles.label}>Tanggal</Text><Text style={styles.value}>{text(item, "transactionAt")}</Text><Text style={styles.label}>Bukti</Text>{text(item, "evidenceKey") ? <Button accessibilityLabel="Buka bukti transaksi" onPress={() => void openEvidence()} variant="outline" className="min-h-11 self-start rounded-xl border-[#D9E1EE] bg-white px-3"><ButtonText className="text-xs font-extrabold text-[#1454C4]">Buka bukti transaksi</ButtonText></Button> : <Text style={styles.value}>Tidak ada bukti terlampir</Text>}</View>{canApprove && status === "DRAFT" ? <Pressable onPress={() => void approve()} style={styles.primary}><Text style={styles.primaryText}>Setujui Transaksi</Text></Pressable> : null}{canApprove && status === "SAH" ? <View style={styles.card}><TextInput value={reason} onChangeText={setReason} placeholder="Alasan pembalikan" multiline style={styles.input} /><Pressable onPress={() => void reverse()} style={styles.danger}><Text style={styles.primaryText}>Balikkan Transaksi</Text></Pressable></View> : null}</Screen><BottomNav current="finance" role={role} /></>;
}
const styles = StyleSheet.create({ hero: { backgroundColor: colors.primaryDark, borderRadius: 15, gap: 8, padding: spacing.lg }, label: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, amount: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: 8, padding: spacing.md }, value: { color: colors.text, fontSize: 12 }, link: { color: colors.primary, fontSize: 12, fontWeight: "900" }, input: { borderColor: colors.border, borderRadius: 9, borderWidth: 1, color: colors.text, minHeight: 62, padding: 10, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, padding: 13 }, danger: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 10, padding: 13 }, primaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" } });
