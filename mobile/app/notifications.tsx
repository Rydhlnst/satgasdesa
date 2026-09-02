import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth";
import { EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { showActionError } from "../src/lib/feedback";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../src/lib/api";
import { notificationTarget } from "../src/notifications/target";
import type { NotificationItem } from "../src/types";
import { colors } from "../src/theme";

export default function Notifications() {
  const { role } = useAuth();
  const router = useRouter();
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications({ pageSize: 50 }), enabled: Boolean(role) });
  if (!role) return null;
  async function open(item: NotificationItem) {
    try { if (!item.readAt) { await markNotificationRead(item.id); await query.refetch(); } const href = notificationTarget(item); if (href) router.push(href); } catch (error) { showActionError(error, "Notifikasi belum dapat dibuka. Periksa koneksi lalu coba lagi."); }
  }
  async function readAll() { try { await markAllNotificationsRead(); await query.refetch(); } catch (error) { showActionError(error, "Notifikasi belum dapat diperbarui. Periksa koneksi lalu coba lagi."); } }
 return <><Header role={role} title="Notifikasi" subtitle="Pembaruan yang perlu Anda perhatikan" /><Screen scroll={false}>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Notifikasi tidak dapat dimuat." error={query.error} onRetry={() => void query.refetch()} /> : <><Pressable accessibilityRole="button" accessibilityLabel="Tandai semua notifikasi sudah dibaca" onPress={() => void readAll()} style={styles.readAll}><CheckCheck color={colors.primary} size={16} /><Text style={styles.readAllText}>Tandai semua sudah dibaca</Text></Pressable>{query.data?.items.length ? <FlatList style={{ flex: 1 }} data={query.data.items} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} onRefresh={() => void query.refetch()} refreshing={query.isRefetching} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Buka notifikasi: ${item.title}`} onPress={() => void open(item)} style={({ pressed }) => [styles.item, !item.readAt && styles.unread, pressed && styles.pressed]}><Bell color={!item.readAt ? colors.primary : colors.textMuted} size={19} /><View style={styles.body}><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("id-ID")}</Text></View></Pressable>} /> : <EmptyState title="Belum ada notifikasi" description="Pemberitahuan alur kerja akan muncul di sini." />}</>}</Screen></>;
}

const styles = StyleSheet.create({ readAll: { alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: 6, minHeight: 44 }, readAllText: { color: colors.primary, fontSize: 11, fontWeight: "900" }, list: { gap: 4, paddingBottom: 8, paddingTop: 4 }, item: { alignItems: "flex-start", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, minHeight: 68, paddingHorizontal: 8, paddingVertical: 10 }, unread: { backgroundColor: "#F5F8FF" }, body: { flex: 1, gap: 3 }, title: { color: colors.textStrong, fontSize: 12, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, date: { color: colors.textSubtle, fontSize: 9, marginTop: 3 }, pressed: { opacity: 0.72 } });
