import { useQuery } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth";
import { EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../src/lib/api";
import type { NotificationItem } from "../src/types";
import { colors, spacing } from "../src/theme";

export default function Notifications() {
  const { role } = useAuth(); const router = useRouter();
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications({ pageSize: 50 }), enabled: Boolean(role) });
  if (!role) return null;
  async function open(item: NotificationItem) { if (!item.readAt) { await markNotificationRead(item.id); await query.refetch(); } const href = target(item); if (href) router.push(href); }
  async function readAll() { await markAllNotificationsRead(); await query.refetch(); }
  return <><Header role={role} title="Notifications" subtitle="Updates requiring your attention" /><Screen>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Notifications could not be loaded." onRetry={() => void query.refetch()} /> : <><Pressable onPress={() => void readAll()} style={styles.readAll}><CheckCheck color={colors.primary} size={16} /><Text style={styles.readAllText}>Mark all as read</Text></Pressable>{query.data?.items.length ? <ScrollView contentContainerStyle={styles.list}>{query.data.items.map((item) => <Pressable key={item.id} onPress={() => void open(item)} style={[styles.item, !item.readAt && styles.unread]}><Bell color={!item.readAt ? colors.primary : colors.textMuted} size={19} /><View style={styles.body}><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("id-ID")}</Text></View></Pressable>)}</ScrollView> : <EmptyState message="No notifications yet." />}</>}</Screen></>;
}

function target(item: NotificationItem): Href | null { if (!item.relatedEntityId) return null; if (item.relatedEntityType === "BLOCK") return `/blocks/${item.relatedEntityId}` as Href; if (item.relatedEntityType === "INSPECTION") return `/inspection/${item.relatedEntityId}` as Href; if (item.relatedEntityType === "DAILY_INFORMATION") return `/information/${item.relatedEntityId}` as Href; if (item.relatedEntityType === "DUE") return `/due/${item.relatedEntityId}` as Href; if (item.relatedEntityType === "REALIZATION") return `/realization/${item.relatedEntityId}` as Href; return "/finance"; }

const styles = StyleSheet.create({ readAll: { alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: 6 }, readAllText: { color: colors.primary, fontSize: 11, fontWeight: "900" }, list: { gap: spacing.sm }, item: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, unread: { borderColor: "#9EBCF5", backgroundColor: "#F5F8FF" }, body: { flex: 1, gap: 3 }, title: { color: colors.text, fontSize: 12, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, date: { color: colors.textMuted, fontSize: 9, marginTop: 3 } });
