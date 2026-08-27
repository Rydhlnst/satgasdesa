import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ClipboardCheck } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { getFieldTasks } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

const statuses = ["Semua", "TODO", "Dikerjakan", "Selesai", "Dibatalkan"];
const statusValues = ["", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

export default function TasksScreen() {
  const { role, session } = useAuth();
  const router = useRouter();
  const [statusIndex, setStatusIndex] = useState(0); const [query, setQuery] = useState("");
  const canCreate = session?.permissions.includes("FIELD_ASSIGNMENT_MANAGE") ?? false;
  const result = useQuery({ queryKey: ["field-tasks", statusIndex, query, role], queryFn: () => getFieldTasks({ status: statusValues[statusIndex], query, mine: role === "PETUGAS_LAPANGAN" ? "true" : "" }), enabled: Boolean(role) });
  if (!role) return null;
  const tasks = result.data?.items ?? [];
  return <><Header role={role} title={role === "PETUGAS_LAPANGAN" ? "Tugas Saya" : "Tugas Lapangan"} subtitle="Pemantauan pekerjaan per blok" /><Screen><InteractiveTabs active={statusIndex} items={statuses} onChange={setStatusIndex} /><SearchField value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="Cari tugas..." />{result.isLoading ? <LoadingState /> : result.isError ? <ErrorState message="Tugas lapangan tidak dapat dimuat." onRetry={() => result.refetch()} /> : <ScrollView contentContainerStyle={styles.list}>{tasks.length ? tasks.map((item) => <RowCard key={text(item, "id")} onPress={() => router.push(`/task/${text(item, "id")}`)} icon={<ClipboardCheck color={colors.primary} size={22} />} title={text(item, "title")} subtitle={`Blok: ${text(item, "blockId")} · Prioritas ${text(item, "priority")}`} meta={text(item, "dueDate", "Tanpa tenggat")} status={text(item, "status")} tone={text(item, "status") === "DONE" ? "green" : text(item, "status") === "CANCELLED" ? "red" : "orange"} />) : <EmptyState message="Tidak ada tugas pada filter ini." />}</ScrollView>}{canCreate ? <ActionButton onPress={() => router.push("/task/new")}>Buat Tugas Lapangan</ActionButton> : null}</Screen><BottomNav current="monitoring" role={role} /></>;
}

const styles = StyleSheet.create({ search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 43, paddingHorizontal: 12 }, list: { gap: spacing.sm, paddingBottom: 92 }, });
