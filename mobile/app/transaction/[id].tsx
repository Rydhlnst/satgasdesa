import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../src/auth";
import { BottomNav, ErrorState, Header, LoadingState, Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/PimpinanPrimitives";
import { approveFinancialTransaction, getFinancialTransactionEvidenceDownloadUrl, getTransaction, reverseFinancialTransaction } from "../../src/lib/api";
import { money } from "../../src/lib/format";
import { numberValue, text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { role, session } = useAuth(); const client = useQueryClient(); const [reason, setReason] = useState("");
  const query = useQuery({ queryKey: ["transaction", id], queryFn: () => getTransaction(id), enabled: Boolean(role && id) });
  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Detail Transaksi" /><Screen><LoadingState /></Screen></>;
  if (query.isError || !query.data?.item) return <><Header role={role} title="Detail Transaksi" /><Screen><ErrorState message="Transaksi tidak dapat dimuat." onRetry={() => query.refetch()} /></Screen></>;
  const item = query.data.item; const status = text(item, "status"); const canApprove = session?.permissions.includes("FINANCE_APPROVE");
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["transaction", id] }); await client.invalidateQueries({ queryKey: ["transactions"] }); };
  async function approve() { try { await approveFinancialTransaction({ id }); await refresh(); } catch (error) { Alert.alert("Tidak dapat menyetujui", error instanceof Error ? error.message : "Coba lagi."); } }
  async function reverse() { if (!reason.trim()) return Alert.alert("Alasan diperlukan", "Masukkan alasan pembalikan transaksi."); try { await reverseFinancialTransaction({ id, reason }); setReason(""); await refresh(); } catch (error) { Alert.alert("Tidak dapat membalikkan", error instanceof Error ? error.message : "Coba lagi."); } }
  async function openEvidence() { try { const result = await getFinancialTransactionEvidenceDownloadUrl({ id }); await Linking.openURL(result.downloadUrl); } catch (error) { Alert.alert("Bukti tidak dapat dibuka", error instanceof Error ? error.message : "Coba lagi."); } }
  return <><Header role={role} title="Detail Transaksi" subtitle={text(item, "transactionCode")} /><Screen><View style={styles.hero}><Text style={styles.label}>{text(item, "transactionType") === "CASH_IN" ? "PEMASUKAN" : "PENGELUARAN"}</Text><Text style={styles.amount}>{money(numberValue(item, "amount"))}</Text><StatusPill tone={status === "SAH" ? "green" : status === "REVERSED" ? "gray" : "orange"}>{status}</StatusPill></View><View style={styles.card}><Text style={styles.label}>Uraian</Text><Text style={styles.value}>{text(item, "description")}</Text><Text style={styles.label}>Tanggal</Text><Text style={styles.value}>{text(item, "transactionAt")}</Text><Text style={styles.label}>Bukti</Text>{text(item, "evidenceKey") ? <Pressable onPress={() => void openEvidence()}><Text style={styles.link}>Buka bukti transaksi</Text></Pressable> : <Text style={styles.value}>Tidak ada bukti terlampir</Text>}</View>{canApprove && status === "DRAFT" ? <Pressable onPress={() => void approve()} style={styles.primary}><Text style={styles.primaryText}>Setujui Transaksi</Text></Pressable> : null}{canApprove && status === "SAH" ? <View style={styles.card}><TextInput value={reason} onChangeText={setReason} placeholder="Alasan pembalikan" multiline style={styles.input} /><Pressable onPress={() => void reverse()} style={styles.danger}><Text style={styles.primaryText}>Balikkan Transaksi</Text></Pressable></View> : null}</Screen><BottomNav current="finance" role={role} /></>;
}
const styles = StyleSheet.create({ hero: { backgroundColor: colors.primaryDark, borderRadius: 15, gap: 8, padding: spacing.lg }, label: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, amount: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: 8, padding: spacing.md }, value: { color: colors.text, fontSize: 12 }, link: { color: colors.primary, fontSize: 12, fontWeight: "900" }, input: { borderColor: colors.border, borderRadius: 9, borderWidth: 1, color: colors.text, minHeight: 62, padding: 10, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, padding: 13 }, danger: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 10, padding: 13 }, primaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" } });
