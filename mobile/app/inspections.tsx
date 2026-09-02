import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { DatePicker, SelectField } from "../src/components/NativeForm";
import { useDateRange } from "../src/date-range-provider";
import { getBlocks, getInspections } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

export default function Inspections() {
  const { role, session } = useAuth(); const router = useRouter(); const { range } = useDateRange(); const [tab, setTab] = useState(0); const [queryText, setQueryText] = useState(""); const [blockId, setBlockId] = useState(""); const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState("");
  const filters = { ...(tab === 1 ? { status: "DRAFT" } : tab === 2 ? { status: "SUBMITTED" } : {}), ...(role === "PETUGAS_LAPANGAN" ? { mine: "true" } : {}), ...(queryText ? { query: queryText } : {}), ...(blockId ? { blockId } : {}), ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) };
  const query = useQuery({ queryKey: ["inspections", range.dateFrom, range.dateTo, filters], queryFn: () => getInspections(filters), enabled: Boolean(role) });
  const blocks = useQuery({ queryKey: ["blocks", "inspection-filter"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  if (!role) return null;
  const rows = query.data?.inspections ?? [];
  const canCreate = session?.permissions.includes("INSPECTION_CREATE");
  return <><Header role={role} title="Pemeriksaan Blok" subtitle="Verifikasi kondisi lapangan" /><Screen><InteractiveTabs active={tab} items={["Semua", "Draf", "Terkirim"]} onChange={setTab} /><View style={styles.filters}><SearchField value={queryText} onChangeText={setQueryText} onClear={() => setQueryText("")} placeholder="Cari kode atau nama blok" /><SelectField label="Blok" value={blockId} options={[{ label: "Semua blok", value: "" }, ...(blocks.data?.blocks ?? []).map((block) => ({ label: `${block.code} · ${block.name}`, value: block.id }))]} onChange={setBlockId} /><View style={styles.dates}><View style={styles.date}><DatePicker label="Dari" value={dateFrom} onChange={setDateFrom} /></View><View style={styles.date}><DatePicker label="Sampai" value={dateTo} onChange={setDateTo} /></View></View></View>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Data pemeriksaan tidak dapat dimuat." error={query.error} onRetry={() => query.refetch()} /> : rows.length ? <View style={styles.list}>{rows.map((item) => <RowCard key={text(item, "id")} onPress={() => router.push(`/inspection/${text(item, "id")}`)} icon={<ClipboardCheck color={colors.primary} size={22} />} title={`${text(item, "blockCode", "Blok")} · ${text(item, "blockName")}`} subtitle={`${text(item, "condition")} · Jalan ${text(item, "roadCondition", "-")} · ${text(item, "excavatorCount", "0")} alat berat`} meta={`Diperiksa: ${text(item, "inspectedAt")}`} status={text(item, "status", "SUBMITTED") === "DRAFT" ? "Draf" : "Terkirim"} tone={text(item, "status") === "DRAFT" ? "orange" : "green"} />)}</View> : <EmptyState message="Tidak ada pemeriksaan yang sesuai filter." action={canCreate ? { label: "Tambah pemeriksaan", onPress: () => router.push("/inspection/new") } : undefined} />}{canCreate && rows.length ? <ActionButton onPress={() => router.push("/inspection/new")}>Tambah Pemeriksaan</ActionButton> : null}</Screen><BottomNav current="inspections" role={role} /></>;
}
const styles = StyleSheet.create({ filters: { gap: spacing.sm }, dates: { flexDirection: "row", gap: spacing.sm }, date: { flex: 1 }, list: { gap: spacing.sm, paddingBottom: 8 } });
