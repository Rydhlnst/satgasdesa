import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { HardHat } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { getFieldWorkers } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

export default function WorkersScreen() {
  const { role, session } = useAuth(); const router = useRouter(); const [active, setActive] = useState(0); const [query, setQuery] = useState("");
  const result = useQuery({ queryKey: ["field-workers", active, query], queryFn: () => getFieldWorkers({ query, status: active === 0 ? "" : active === 1 ? "ACTIVE" : "INACTIVE" }), enabled: Boolean(role) });
  if (!role) return null;
  const items = result.data?.items ?? []; const canManage = session?.permissions.includes("WORKER_MANAGE") ?? false;
  return <><Header role={role} title="Pekerja Lapangan" subtitle="Data pekerja dan penempatan blok" /><Screen><InteractiveTabs active={active} items={["Semua", "Aktif", "Nonaktif"]} onChange={setActive} /><SearchField value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="Cari pekerja atau jabatan..." />{result.isLoading ? <LoadingState /> : result.isError ? <ErrorState message="Data pekerja tidak dapat dimuat." onRetry={() => result.refetch()} /> : <ScrollView contentContainerStyle={styles.list}>{items.length ? items.map((item) => <RowCard key={text(item, "id")} onPress={() => router.push(`/worker/${text(item, "id")}`)} icon={<HardHat color={colors.warning} size={22} />} title={text(item, "fullName")} subtitle={`${text(item, "position", "Pekerja lapangan")} · Blok ${text(item, "currentBlockId", "Belum ditempatkan")}`} meta={text(item, "phone", "Tanpa kontak")} status={text(item, "status")} tone={text(item, "status") === "ACTIVE" ? "green" : "gray"} />) : <EmptyState message="Belum ada pekerja pada filter ini." />}</ScrollView>}{canManage ? <ActionButton onPress={() => router.push("/worker/new")}>Tambah Pekerja</ActionButton> : null}</Screen><BottomNav current="monitoring" role={role} /></>;
}

const styles = StyleSheet.create({ search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 43, paddingHorizontal: 12 }, list: { gap: spacing.sm, paddingBottom: 92 } });
