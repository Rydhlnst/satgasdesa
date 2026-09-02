import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../src/auth";
import { PaymentActionSheet, PaymentEvidenceViewer } from "../../src/components/PaymentActionSheet";
import { RowCard, StatusPill } from "../../src/components/PimpinanPrimitives";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../../src/components/Screen";
import { TextInput } from "../../src/components/AppPrimitives";
import { AppAlert as Alert, showActionError } from "../../src/lib/feedback";
import { confirmDuePayment, getDue, getDuePaymentEvidenceDownloadUrl, rejectDuePayment, reverseDuePayment } from "../../src/lib/api";
import { money } from "../../src/lib/format";
import { createClientId, routeParam } from "../../src/lib/id";
import { displayStatus, numberValue, text } from "../../src/lib/read";
import { duePaymentIdFormSchema, duePaymentRejectionFormSchema, reversalFormSchema } from "../../src/form-schemas";
import { colors, radii, spacing, typography } from "../../src/theme";

type Payment = Record<string, unknown>;

export default function DueDetail() {
  const params = useLocalSearchParams<{ id?: string | string[] }>(); const id = routeParam(params.id);
  const { role, session } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["due", id], queryFn: () => getDue(id), enabled: Boolean(role && id) });

  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Detail Iuran" /><Screen withBottomNav={false}><LoadingState /></Screen></>;
  if (query.isError || !query.data?.due) return <><Header role={role} title="Detail Iuran" /><Screen withBottomNav={false}><ErrorState message="Detail iuran tidak dapat dimuat." error={query.error} onRetry={() => query.refetch()} /></Screen></>;

  const record = query.data.due as { item?: Record<string, unknown>; payments?: Payment[]; verifications?: Array<Record<string, unknown>> };
  const due = record.item ?? {};
  const payments = record.payments ?? [];
  const verifications = record.verifications ?? [];
  const canPay = session?.permissions.includes("PAYMENT_CREATE") ?? false;
  const canConfirm = session?.permissions.includes("PAYMENT_CONFIRM") ?? false;
  const canReverse = session?.permissions.includes("DUES_MANAGE") ?? false;
  const canVerify = session?.permissions.includes("PAYMENT_FIELD_VERIFY") ?? false;
  const canCancelPending = (payment: Payment) => canPay && (canReverse || text(payment, "recordedBy") === session?.user.id);
  const remaining = numberValue(due, "remaining");
  const verificationTarget = payments.find((payment) => text(payment, "status") === "PENDING") ?? payments[0];
  const selectedStatus = text(selectedPayment ?? undefined, "status", "PENDING");
  const selectedPending = selectedStatus === "PENDING";
  const selectedCancellable = Boolean(selectedPayment && ((selectedPending && canCancelPending(selectedPayment)) || (!selectedPending && selectedStatus === "CONFIRMED" && canReverse)));

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["due", id] }),
      client.invalidateQueries({ queryKey: ["dues"] }),
      client.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  }

  async function reverse(paymentId: string) {
    if (saving) return;
    const parsed = reversalFormSchema.safeParse({ reason });
    if (!parsed.success) return Alert.alert("Alasan diperlukan", parsed.error.issues[0]?.message ?? "Masukkan alasan pembatalan pembayaran.");
    setSaving(true);
    try {
      await reverseDuePayment({ duePaymentId: paymentId, ...parsed.data, idempotencyKey: createClientId() });
      setReason("");
      setSelectedPayment(null);
      await refresh();
    } catch (error) {
      showActionError(error, "Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  function requestCancellation(paymentId: string, pending: boolean) {
    if (!reason.trim()) return Alert.alert("Alasan diperlukan", "Masukkan alasan pembatalan pembayaran terlebih dahulu.");
    Alert.alert("Batalkan pembayaran?", pending ? "Pembayaran yang masih menunggu akan dibatalkan dan tidak menambah saldo iuran." : "Pembayaran yang sudah dikonfirmasi akan dibatalkan dan saldo iuran akan dikoreksi.", [
      { text: "Kembali", style: "cancel" },
      { text: "Batalkan", style: "destructive", onPress: () => void reverse(paymentId) },
    ]);
  }

  async function openEvidence(paymentId: string) {
    try {
      const result = await getDuePaymentEvidenceDownloadUrl({ duePaymentId: paymentId });
      setSelectedPayment(null);
      setEvidenceUri(result.downloadUrl);
    } catch (error) {
      showActionError(error, "Bukti pembayaran tidak dapat dimuat. Coba lagi.");
    }
  }

  async function decide(paymentId: string, approved: boolean) {
    if (saving) return;
    const parsed = approved ? duePaymentIdFormSchema.safeParse({ duePaymentId: paymentId }) : duePaymentRejectionFormSchema.safeParse({ duePaymentId: paymentId, reason: "Ditolak oleh Bendahara" });
    if (!parsed.success) return Alert.alert("Pembayaran tidak valid", parsed.error.issues[0]?.message ?? "Muat ulang detail iuran lalu coba lagi.");
    setSaving(true);
    try {
      if (approved) await confirmDuePayment(parsed.data);
      else await rejectDuePayment(parsed.data);
      setSelectedPayment(null);
      await refresh();
    } catch (error) {
      showActionError(error, "Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const actionItems = selectedPayment ? [
    ...(text(selectedPayment, "evidenceKey") ? [{ label: "Lihat bukti pembayaran", icon: "evidence" as const, onPress: () => openEvidence(text(selectedPayment, "id")) }] : []),
    ...(selectedPending && canConfirm ? [
      { label: "Konfirmasi pembayaran", icon: "confirm" as const, tone: "success" as const, onPress: () => decide(text(selectedPayment, "id"), true) },
      { label: "Tolak pembayaran", icon: "reject" as const, tone: "danger" as const, onPress: () => decide(text(selectedPayment, "id"), false) },
    ] : []),
    ...(canVerify ? [{ label: "Verifikasi lapangan", icon: "verify" as const, onPress: () => { setSelectedPayment(null); router.push({ pathname: "/payment/verify", params: { duePaymentId: text(selectedPayment, "id") } }); } }] : []),
    ...(selectedCancellable ? [{ label: "Batalkan pembayaran", icon: "reverse" as const, tone: "danger" as const, onPress: () => requestCancellation(text(selectedPayment, "id"), selectedPending) }] : []),
  ] : [];

  return <><Header role={role} title="Detail Iuran" subtitle={text(due, "referenceKey")} /><Screen>
    <View style={styles.summary}>
      <Text style={styles.label}>SISA TAGIHAN IURAN INI</Text>
      <Text style={styles.amount}>{money(remaining)}</Text>
      <StatusPill tone={text(due, "paymentState") === "PAID" ? "green" : "orange"}>{displayStatus(text(due, "paymentState"))}</StatusPill>
      <Text style={styles.value}>{text(due, "payerName")} · {displayStatus(text(due, "dueType"))}</Text>
      <Text style={styles.value}>Kewajiban: {money(numberValue(due, "amountDue"))} · Diterima: {money(numberValue(due, "amountPaid"))}</Text>
    </View>
    {canPay && remaining > 0 ? <Pressable accessibilityRole="button" onPress={() => router.push(`/payment/${id}`)} style={styles.primary}><Text style={styles.primaryText}>Catat Pembayaran</Text></Pressable> : null}
    {payments.some((payment) => canCancelPending(payment) || (canReverse && text(payment, "status") === "CONFIRMED")) ? <View style={styles.reversal}><Text style={styles.reversalLabel}>Alasan pembatalan</Text><TextInput value={reason} onChangeText={setReason} placeholder="Contoh: data pembayaran perlu diperbaiki" multiline style={styles.input} /></View> : null}
    <View style={styles.section}>
      <Text style={styles.title}>Riwayat Pembayaran</Text>
      <Text style={styles.sectionHint}>Ketuk pembayaran untuk melihat bukti dan tindakan.</Text>
      {payments.length ? payments.map((payment) => {
        const status = text(payment, "status", "PENDING");
        const tone = status === "REJECTED" || status === "REVERSED" || status === "CANCELLED" ? "gray" : status === "PENDING" ? "orange" : "green";
        const canOpenActions = Boolean(text(payment, "evidenceKey") || (status === "PENDING" && canConfirm) || canVerify || ((status === "PENDING" && canCancelPending(payment)) || (status === "CONFIRMED" && canReverse)));
        return <View key={text(payment, "id")} style={styles.payment}>
          <RowCard title={money(numberValue(payment, "amount"))} subtitle={`${text(payment, "payerName")} · ${displayStatus(text(payment, "method"))}`} meta={text(payment, "paymentDate")} status={displayStatus(status)} tone={tone} onPress={canOpenActions ? () => setSelectedPayment(payment) : undefined} />
          {status === "PENDING" ? <Text style={styles.paymentNote}>Belum menambah saldo sampai dikonfirmasi Bendahara.</Text> : null}
          {status === "CANCELLED" ? <Text style={styles.paymentNote}>Pembayaran ini sudah dibatalkan.</Text> : null}
          {text(payment, "notes") ? <Text style={styles.paymentNote}>Catatan: {text(payment, "notes")}</Text> : null}
        </View>;
      }) : <EmptyState title="Belum ada pembayaran" description="Belum ada pembayaran yang dicatat untuk iuran ini." action={canPay && remaining > 0 ? { label: "Catat pembayaran pertama", onPress: () => router.push(`/payment/${id}`) } : undefined} />}
    </View>
    <View style={styles.section}><Text style={styles.title}>Verifikasi Lapangan</Text>{verifications.length ? verifications.map((entry) => <RowCard key={text(entry, "due_payment_verification", "id")} title={displayStatus(text(entry, "verificationStatus"))} subtitle={text(entry, "notes", "Tanpa catatan")} meta={text(entry, "verifiedAt")} />) : <EmptyState title="Belum ada verifikasi" description={canVerify ? "Ketuk pembayaran untuk memulai verifikasi lapangan." : "Verifikasi lapangan akan muncul setelah pembayaran diperiksa."} action={canVerify && verificationTarget ? { label: "Mulai verifikasi", onPress: () => router.push({ pathname: "/payment/verify", params: { duePaymentId: text(verificationTarget, "id") } }) } : undefined} />}</View>
  </Screen><PaymentActionSheet visible={Boolean(selectedPayment)} onClose={() => setSelectedPayment(null)} amount={selectedPayment ? money(numberValue(selectedPayment, "amount")) : ""} detail={selectedPayment ? `${text(selectedPayment, "payerName")} · ${displayStatus(text(selectedPayment, "method"))}` : ""} status={displayStatus(selectedStatus)} statusTone={selectedStatus === "PENDING" ? "orange" : selectedStatus === "CONFIRMED" ? "green" : "gray"} actions={actionItems} /><PaymentEvidenceViewer visible={Boolean(evidenceUri)} uri={evidenceUri} onClose={() => setEvidenceUri(null)} /><BottomNav current="finance" role={role} /></>;
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.primaryDark, borderRadius: radii.lg, gap: 7, padding: spacing.lg },
  label: { color: "#DCE7FF", fontSize: typography.micro, fontWeight: "800", letterSpacing: 0.6 },
  amount: { color: "#FFFFFF", fontSize: 26, fontWeight: "900" },
  value: { color: "#DCE7FF", fontSize: typography.caption },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radii.md, minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.lg },
  primaryText: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "900" },
  reversal: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  reversalLabel: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "800", marginBottom: 6 },
  input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 54, padding: 10, textAlignVertical: "top" },
  section: { gap: spacing.sm },
  sectionHint: { color: colors.textMuted, fontSize: typography.micro, marginTop: -2 },
  payment: { gap: 4 },
  paymentNote: { color: colors.textMuted, fontSize: typography.micro, lineHeight: 14, paddingLeft: spacing.sm },
  title: { color: colors.textStrong, fontSize: typography.section, fontWeight: "900" },
});
