import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ClipboardCheck } from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet } from "react-native";

import { useAuth } from "../src/auth";
import { useDateRange } from "../src/date-range-provider";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { getFieldTasks } from "../src/lib/api";
import { displayStatus, text } from "../src/lib/read";
import { colors } from "../src/theme";

const statuses = ["Semua", "Belum dikerjakan", "Sedang dikerjakan", "Selesai", "Dibatalkan"];
const statusValues = ["", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

export default function TasksScreen() {
  const { role, session } = useAuth();
  const router = useRouter();
  const { range } = useDateRange();
  const [statusIndex, setStatusIndex] = useState(0);
  const [query, setQuery] = useState("");
  const canCreate = session?.permissions.includes("FIELD_ASSIGNMENT_MANAGE") ?? false;
  const result = useQuery({ queryKey: ["field-tasks", range.dateFrom, range.dateTo, statusIndex, query, role], queryFn: () => getFieldTasks({ status: statusValues[statusIndex], query, mine: role === "PETUGAS_LAPANGAN" ? "true" : "" }), enabled: Boolean(role) });
  if (!role) return null;
  const tasks = result.data?.items ?? [];
 return <><Header role={role} title={role === "PETUGAS_LAPANGAN" ? "Tugas Saya" : "Tugas Lapangan"} subtitle="Pemantauan pekerjaan per blok" /><Screen withBottomNav scroll={false}><InteractiveTabs active={statusIndex} items={statuses} onChange={setStatusIndex} /><SearchField value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="Cari tugas..." />{result.isLoading ? <LoadingState /> : result.isError ? <ErrorState message="Tugas lapangan tidak dapat dimuat." error={result.error} onRetry={() => result.refetch()} /> : <FlatList style={{ flex: 1 }} data={tasks} keyExtractor={(item) => text(item, "id")} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} onRefresh={() => void result.refetch()} refreshing={result.isRefetching} renderItem={({ item }) => <RowCard onPress={() => router.push(`/task/${text(item, "id")}`)} icon={<ClipboardCheck color={colors.primary} size={20} />} title={text(item, "title")} subtitle={`Blok: ${text(item, "blockId")} · Prioritas ${displayStatus(text(item, "priority"))}`} meta={text(item, "dueDate", "Tanpa tenggat")} status={text(item, "status")} tone={text(item, "status") === "DONE" ? "green" : text(item, "status") === "CANCELLED" ? "red" : "orange"} />} ListEmptyComponent={<EmptyState message="Tidak ada tugas pada filter ini." action={canCreate ? { label: "Buat tugas lapangan", onPress: () => router.push("/task/new") } : undefined} />} ListFooterComponent={canCreate && tasks.length ? <ActionButton onPress={() => router.push("/task/new")}>Buat Tugas Lapangan</ActionButton> : null} />}</Screen><BottomNav current="monitoring" role={role} /></>;
}

const styles = StyleSheet.create({ list: { gap: 4, paddingBottom: 8, paddingTop: 4 } });
