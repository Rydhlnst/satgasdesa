import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";

import { useAuth } from "../../src/auth";
import { ErrorState, Header, LoadingState, Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/PimpinanPrimitives";
import { getFieldTask, updateFieldTask } from "../../src/lib/api";
import { displayStatus, text } from "../../src/lib/read";
import { colors, spacing } from "../../src/theme";
import { taskStatusFormSchema } from "../../src/form-schemas";

const nextStates: Record<string, string[]> = { TODO: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["DONE", "CANCELLED"], DONE: [], CANCELLED: [] };

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { role, session } = useAuth(); const client = useQueryClient(); const [saving, setSaving] = useState(false); const query = useQuery({ queryKey: ["field-task", id], queryFn: () => getFieldTask(id), enabled: Boolean(role && id) });
  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Detail Tugas" /><Screen><LoadingState /></Screen></>;
  if (query.isError || !query.data) return <><Header role={role} title="Detail Tugas" /><Screen><ErrorState message="Tugas tidak dapat dimuat." error={query.error} onRetry={() => query.refetch()} /></Screen></>;
  const item = query.data.item; const status = text(item, "status"); const canManage = session?.permissions.includes("FIELD_TASK_MANAGE") ?? false;
  async function transition(next: string) { if (saving) return; const parsed = taskStatusFormSchema.safeParse({ id, status: next }); if (!parsed.success) return Alert.alert("Status tugas tidak valid", parsed.error.issues[0]?.message ?? "Muat ulang tugas lalu coba lagi."); setSaving(true); try { await updateFieldTask(parsed.data); await client.invalidateQueries({ queryKey: ["field-task", id] }); await client.invalidateQueries({ queryKey: ["field-tasks"] }); } catch (error) { Alert.alert("Tidak dapat memperbarui tugas", error instanceof Error ? error.message : "Coba lagi."); } finally { setSaving(false); } }
  return <><Header role={role} title="Detail Tugas" subtitle="Status dan tanggung jawab pekerjaan" /><Screen><View style={styles.hero}><Text style={styles.title}>{text(item, "title")}</Text><StatusPill tone={status === "DONE" ? "green" : status === "CANCELLED" ? "red" : "orange"}>{displayStatus(status)}</StatusPill><Text style={styles.copy}>{text(item, "description", "Tanpa deskripsi")}</Text></View><View style={styles.card}><Text style={styles.label}>Blok</Text><Text style={styles.value}>{text(item, "blockId")}</Text><Text style={styles.label}>Tenggat</Text><Text style={styles.value}>{text(item, "dueDate", "Tidak ditentukan")}</Text><Text style={styles.label}>Prioritas</Text><Text style={styles.value}>{displayStatus(text(item, "priority"))}</Text></View>{canManage && (nextStates[status] ?? []).length ? <View style={styles.card}>{(nextStates[status] ?? []).map((next) => <Pressable disabled={saving} key={next} onPress={() => void transition(next)} style={[styles.action, next === "CANCELLED" && styles.danger]}><Text style={styles.actionText}>{next === "IN_PROGRESS" ? "Mulai Pekerjaan" : next === "DONE" ? "Tandai Selesai" : "Batalkan Tugas"}</Text></Pressable>)}</View> : null}</Screen></>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: colors.primaryDark, borderRadius: 16, gap: spacing.sm, padding: spacing.lg }, title: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" }, copy: { color: "#DCE7FF", fontSize: 13, lineHeight: 19 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: 5, padding: spacing.md }, label: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, value: { color: colors.text, fontSize: 13, marginBottom: spacing.sm }, action: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 9, padding: 13 }, danger: { backgroundColor: colors.danger }, actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" } });
