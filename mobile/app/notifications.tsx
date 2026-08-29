import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth";
import { EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../src/lib/api";
import { notificationTarget } from "../src/notifications/target";
import type { NotificationItem } from "../src/types";
import { colors, spacing } from "../src/theme";

export default function Notifications() {
  const { role } = useAuth(); const router = useRouter();
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications({ pageSize: 50 }), enabled: Boolean(role) });
  if (!role) return null;
  async function open(item: NotificationItem) { if (!item.readAt) { await markNotificationRead(item.id); await query.refetch(); } const href = notificationTarget(item); if (href) router.push(href); }
  async function readAll() { await markAllNotificationsRead(); await query.refetch(); }
  return <><Header role={role} title="Notifikasi" subtitle="Pembaruan yang perlu Anda perhatikan" /><Screen>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Notifikasi tidak dapat dimuat." onRetry={() => void query.refetch()} /> : <><Pressable onPress={() => void readAll()} style={styles.readAll}><CheckCheck color={colors.primary} size={16} /><Text style={styles.readAllText}>Tandai semua sudah dibaca</Text></Pressable>{query.data?.items.length ? <View style={styles.list}>{query.data.items.map((item) => <Pressable key={item.id} onPress={() => void open(item)} style={[styles.item, !item.readAt && styles.unread]}><Bell color={!item.readAt ? colors.primary : colors.textMuted} size={19} /><View style={styles.body}><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("id-ID")}</Text></View></Pressable>)}</View> : <EmptyState title="Belum ada notifikasi" description="Pemberitahuan alur kerja akan muncul di sini." />}</>}</Screen></>;
}

const styles = StyleSheet.create({ readAll: { alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: 6 }, readAllText: { color: colors.primary, fontSize: 11, fontWeight: "900" }, list: { gap: spacing.sm }, item: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, unread: { borderColor: "#9EBCF5", backgroundColor: "#F5F8FF" }, body: { flex: 1, gap: 3 }, title: { color: colors.text, fontSize: 12, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, date: { color: colors.textMuted, fontSize: 9, marginTop: 3 } });
