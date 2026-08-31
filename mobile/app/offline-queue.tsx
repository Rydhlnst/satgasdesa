import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert as Alert } from "../src/lib/feedback";
import { useFocusEffect, useRouter } from "expo-router";

import { BackLink } from "../src/components/MobilePrimitives";
import { Header, Screen } from "../src/components/Screen";
import { useAuth } from "../src/auth";
import { discardOutboxItem, getAttentionOutbox, retryOutboxItem, type OutboxItem } from "../src/offline/store";
import { removeQueuedMedia } from "../src/offline/media";
import { useOfflineSync } from "../src/offline/provider";
import { colors, spacing } from "../src/theme";
import { describeError, showActionError, showActionSuccess } from "../src/lib/feedback";

function operationLabel(operation: OutboxItem["operation"]): string {
  return operation === "CREATE_INSPECTION" ? "Pemeriksaan lapangan" : "Informasi harian";
}

function adviceFor(item: OutboxItem): string {
  if (item.lastErrorStatus === 401) return "Sesi berakhir. Masuk kembali lalu kirim ulang.";
  if (item.lastErrorStatus === 403) return "Akun tidak memiliki izin untuk data ini. Hubungi admin.";
  if (item.lastErrorStatus === 409) return "Data mungkin sudah pernah dikirim. Periksa daftar data sebelum mencoba lagi.";
  if (item.lastErrorStatus && item.lastErrorStatus < 500) return "Periksa kolom yang ditolak, lalu kirim ulang.";
  return "Pastikan koneksi aktif, lalu kirim ulang.";
}

function safeFailureReason(item: OutboxItem) {
  return describeError(item.lastError ? new Error(item.lastError) : undefined, "Data perlu diperiksa sebelum dikirim.").reason;
}

export default function OfflineQueue() {
  const { role } = useAuth();
  const router = useRouter();
  const sync = useOfflineSync();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const load = useCallback(async () => setItems(await getAttentionOutbox()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!role) return null;

  async function retry(item: OutboxItem) {
    try {
      await retryOutboxItem(item.id);
      await sync.syncNow(true);
      const remaining = await getAttentionOutbox();
      setItems(remaining);
      if (remaining.some((entry) => entry.id === item.id)) showActionError(new Error("Data masih ditolak. Periksa alasan dan saran di bawah."));
      else showActionSuccess("Data berhasil dikirim.");
    } catch (error) { showActionError(error); }
  }

  function discard(item: OutboxItem) {
    Alert.alert("Hapus data tersimpan?", "Data dan foto offline ini akan dihapus dari perangkat.", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => void (async () => { try { await discardOutboxItem(item.id); await removeQueuedMedia(item.id); await load(); showActionSuccess("Data offline dihapus."); } catch (error) { showActionError(error); } })() },
    ]);
  }

  return <><Header role={role} title="Antrean Offline" subtitle="Perubahan tersimpan yang perlu ditangani" /><Screen><BackLink label="Kembali" onPress={() => router.back()} /><View style={styles.header}><Text style={styles.title}>Perlu diperbaiki</Text><Text style={styles.copy}>Data belum berhasil dikirim. Baca alasan dan sarannya, lalu coba kirim ulang atau hapus data tersimpan.</Text></View>{items.length ? items.map((item) => <View key={item.id} style={styles.card}><Text style={styles.operation}>{operationLabel(item.operation)}</Text><Text style={styles.error}>{safeFailureReason(item)}</Text>{item.lastErrorCode || item.lastErrorStatus || item.lastErrorRequestId ? <Text style={styles.meta}>{[item.lastErrorCode, item.lastErrorStatus ? `HTTP ${item.lastErrorStatus}` : null, item.lastErrorRequestId ? `ID ${item.lastErrorRequestId}` : null].filter(Boolean).join(" · ")}</Text> : null}<Text style={styles.advice}>{adviceFor(item)}</Text><View style={styles.actions}><Pressable onPress={() => void retry(item)} style={styles.primary}><Text style={styles.primaryText}>Coba kirim lagi</Text></Pressable><Pressable onPress={() => discard(item)} style={styles.secondary}><Text style={styles.secondaryText}>Hapus</Text></Pressable></View></View>) : <View style={styles.empty}><Text style={styles.copy}>Tidak ada data yang perlu diperbaiki.</Text><Pressable onPress={() => router.back()} style={styles.primary}><Text style={styles.primaryText}>Kembali</Text></Pressable></View>}</Screen></>;
}

const styles = StyleSheet.create({ header: { gap: 6 }, title: { color: colors.text, fontSize: 18, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 10, padding: spacing.md }, operation: { color: colors.text, fontSize: 14, fontWeight: "800" }, error: { color: colors.danger, fontSize: 12, lineHeight: 18 }, meta: { color: colors.textMuted, fontSize: 10, fontWeight: "700" }, advice: { color: colors.text, fontSize: 12, lineHeight: 18 }, actions: { flexDirection: "row", gap: 8 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, primaryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, secondary: { alignItems: "center", borderColor: colors.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 }, secondaryText: { color: colors.text, fontSize: 11, fontWeight: "800" }, empty: { alignItems: "center", gap: 12, paddingTop: 80 } });
