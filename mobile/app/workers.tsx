import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { HardHat } from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { getFieldWorkers } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors } from "../src/theme";

export default function WorkersScreen() {
  const { role, session } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const result = useQuery({ queryKey: ["field-workers", active, query], queryFn: () => getFieldWorkers({ query, status: active === 0 ? "" : active === 1 ? "ACTIVE" : "INACTIVE" }), enabled: Boolean(role) });
  if (!role) return null;
  const items = result.data?.items ?? [];
  const canManage = session?.permissions.includes("WORKER_MANAGE") ?? false;
  return <><Header role={role} title="Pekerja Lapangan" subtitle="Data pekerja dan penempatan blok" /><Screen reserveBottomNavSpace scroll={false}><InteractiveTabs active={active} items={["Semua", "Aktif", "Nonaktif"]} onChange={setActive} /><SearchField value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="Cari pekerja atau jabatan..." />{result.isLoading ? <LoadingState /> : result.isError ? <ErrorState message="Data pekerja tidak dapat dimuat." error={result.error} onRetry={() => result.refetch()} /> : <FlatList data={items} keyExtractor={(item) => text(item, "id")} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} renderItem={({ item }) => <RowCard onPress={() => router.push(`/worker/${text(item, "id")}`)} icon={<HardHat color={colors.warning} size={20} />} title={text(item, "fullName")} subtitle={`${text(item, "position", "Pekerja lapangan")} · Blok ${text(item, "currentBlockId", "Belum ditempatkan")}`} meta={text(item, "phone", "Tanpa kontak")} status={text(item, "status")} tone={text(item, "status") === "ACTIVE" ? "green" : "gray"} />} ListEmptyComponent={<EmptyState message="Belum ada pekerja pada filter ini." />} />}{canManage ? <ActionButton onPress={() => router.push("/worker/new")}>Tambah Pekerja</ActionButton> : null}</Screen><BottomNav current="monitoring" role={role} /></>;
}

const styles = StyleSheet.create({ list: { flexGrow: 1, gap: 4, paddingBottom: 8, paddingTop: 4 } });
