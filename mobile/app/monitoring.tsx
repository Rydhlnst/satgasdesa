import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { RemoteThumbnail } from "../src/components/RemoteThumbnail";
import { getBlockPhotoDownloadUrl, getBlocks } from "../src/lib/api";
import { colors, spacing } from "../src/theme";

type StatusFilter = "ALL" | "ACTIVE" | "STOPPED" | "NOT_OPERATING";

export default function Monitoring() {
  const { role, session } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["blocks", search, statusFilter], queryFn: () => getBlocks(search, statusFilter === "ALL" ? undefined : statusFilter), enabled: Boolean(role) });
  const summaries = useQuery({ queryKey: ["blocks", "counts", search], queryFn: () => getBlocks(search), enabled: Boolean(role) });
  const blocks = query.data?.blocks ?? [];
  const allBlocks = summaries.data?.blocks ?? [];
  const counts = { all: allBlocks.length, active: allBlocks.filter((item) => item.status === "ACTIVE").length, stopped: allBlocks.filter((item) => item.status === "STOPPED").length };
  const visibleBlocks = blocks;
  if (!role) return null;

  const canCreate = session?.permissions.includes("BLOCK_CREATE") ?? false;
  const canManageAssignments = session?.permissions.includes("FIELD_ASSIGNMENT_MANAGE") ?? false;
  const content = query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Daftar blok tidak dapat dimuat." onRetry={() => query.refetch()} /> : <FlatList data={visibleBlocks} keyExtractor={(item) => item.id} ListEmptyComponent={<EmptyState message={statusFilter === "ALL" ? "Belum ada data blok." : "Tidak ada blok pada filter ini."} />} onRefresh={() => query.refetch()} refreshing={query.isRefetching} renderItem={({ item }) => <BlockRow item={item} onPress={() => router.push(`/blocks/${item.id}`)} />} contentContainerStyle={styles.list} ListFooterComponent={<View style={styles.actions}>{canCreate ? <ActionButton onPress={() => router.push("/block/new")}>Tambah Blok</ActionButton> : null}{canManageAssignments ? <ActionButton onPress={() => router.push("/assignments")}>Kelola Penugasan Blok</ActionButton> : null}<ActionButton onPress={() => router.push("/tasks")}>{role === "PETUGAS_LAPANGAN" ? "Lihat Tugas Saya" : "Kelola Tugas Lapangan"}</ActionButton><ActionButton onPress={() => router.push("/workers")}>Data Pekerja</ActionButton></View>} />;
  return <><Header role={role} title="Monitoring Blok" subtitle="Daftar blok operasional" /><Screen scroll={false}><InteractiveTabs active={tab} items={["Daftar Blok", "Peta", "Excavator", "Pemeriksaan"]} onChange={(index) => { if (index === 1) router.push("/map"); else if (index === 2) router.push("/excavators"); else if (index === 3) router.push("/inspections"); else setTab(0); }} /><SearchField value={search} onChangeText={setSearch} onClear={() => setSearch("")} placeholder="Cari blok..." /><InteractiveTabs active={statusFilter === "ALL" ? 0 : statusFilter === "ACTIVE" ? 1 : statusFilter === "STOPPED" ? 2 : 3} items={[`Semua (${counts.all})`, `Aktif (${counts.active})`, `Berhenti (${counts.stopped})`, `Belum Operasi (${blocks.filter((item) => item.status === "NOT_OPERATING").length})`]} onChange={(index) => setStatusFilter(index === 0 ? "ALL" : index === 1 ? "ACTIVE" : index === 2 ? "STOPPED" : "NOT_OPERATING")} />{content}</Screen><BottomNav current="monitoring" role={role} /></>;
}

function BlockRow({ item, onPress }: { item: { id: string; code: string; name: string; status: string; workerCount: number; managerName: string | null; locationPhotoKey?: string | null }; onPress: () => void }) { const photoKey = item.locationPhotoKey ?? ""; const status = item.status === "ACTIVE" ? "Aktif" : item.status === "STOPPED" ? "Berhenti" : "Belum Operasi"; return <RowCard onPress={onPress} thumbnail={photoKey ? <RemoteThumbnail queryKey={["block-photo", item.id, photoKey]} loadUrl={async () => (await getBlockPhotoDownloadUrl({ blockId: item.id, storageKey: photoKey })).downloadUrl} /> : undefined} icon={<MapPin color={colors.primary} size={23} />} meta={`Pekerja: ${item.workerCount}${item.managerName ? ` · ${item.managerName}` : ""}`} status={status} title={`${item.code} · ${item.name}`} subtitle="Blok operasional" tone={item.status === "ACTIVE" ? "green" : item.status === "STOPPED" ? "red" : "gray"} />; }

const styles = StyleSheet.create({ search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, height: 44, marginVertical: spacing.sm, paddingHorizontal: 13 }, list: { gap: spacing.sm, paddingBottom: 90, paddingTop: spacing.sm }, actions: { gap: spacing.sm, paddingTop: spacing.sm }, block: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, padding: spacing.md }, blockTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, code: { color: colors.text, fontSize: 13, fontWeight: "800" }, name: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 8 }, detail: { color: colors.textMuted, fontSize: 10, marginTop: 5 }, status: { borderRadius: 10, fontSize: 9, fontWeight: "800", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, active: { backgroundColor: "#E8F6EC", color: colors.success }, inactive: { backgroundColor: "#FFE8E7", color: colors.danger }, neutral: { backgroundColor: "#EEF1F5", color: colors.textMuted } });
