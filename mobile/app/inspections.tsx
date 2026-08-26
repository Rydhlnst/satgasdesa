import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { TextInput } from "../src/components/ui/TextInput";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { DatePicker, SelectField } from "../src/components/NativeForm";
import { getBlocks, getInspections } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

export default function Inspections() {
  const { role, session } = useAuth(); const router = useRouter(); const [tab, setTab] = useState(0); const [queryText, setQueryText] = useState(""); const [blockId, setBlockId] = useState(""); const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState("");
  const filters = { ...(tab === 1 ? { status: "DRAFT" } : tab === 2 ? { status: "SUBMITTED" } : {}), ...(role === "PETUGAS_LAPANGAN" ? { mine: "true" } : {}), ...(queryText ? { query: queryText } : {}), ...(blockId ? { blockId } : {}), ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) };
  const query = useQuery({ queryKey: ["inspections", filters], queryFn: () => getInspections(filters), enabled: Boolean(role) });
  const blocks = useQuery({ queryKey: ["blocks", "inspection-filter"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  if (!role) return null;
  const rows = query.data?.inspections ?? [];
  const canCreate = session?.permissions.includes("INSPECTION_CREATE");
  return <><Header role={role} title="Pemeriksaan Blok" subtitle="Verifikasi kondisi lapangan" /><Screen><InteractiveTabs active={tab} items={["Semua", "Draft", "Terkirim"]} onChange={setTab} /><View style={styles.filters}><TextInput value={queryText} onChangeText={setQueryText} placeholder="Cari kode atau nama blok" placeholderTextColor={colors.textMuted} style={styles.search} /><SelectField label="Blok" value={blockId} onChange={setBlockId} options={[{ label: "Semua blok", value: "" }, ...(blocks.data?.blocks ?? []).map((block) => ({ label: `${block.code} · ${block.name}`, value: block.id }))]} /><View style={styles.dates}><View style={styles.date}><DatePicker label="Dari" value={dateFrom} onChange={setDateFrom} /></View><View style={styles.date}><DatePicker label="Sampai" value={dateTo} onChange={setDateTo} /></View></View></View>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Data pemeriksaan tidak dapat dimuat." onRetry={() => query.refetch()} /> : rows.length ? <ScrollView contentContainerStyle={styles.list}>{rows.map((item) => <RowCard key={text(item, "id")} onPress={() => router.push(`/inspection/${text(item, "id")}`)} icon={<ClipboardCheck color={colors.primary} size={22} />} title={`${text(item, "blockCode", "Blok")} · ${text(item, "blockName")}`} subtitle={`${text(item, "condition")} · Jalan ${text(item, "roadCondition", "-")} · ${text(item, "excavatorCount", "0")} excavator`} meta={`Diperiksa: ${text(item, "inspectedAt")}`} status={text(item, "status", "SUBMITTED") === "DRAFT" ? "Draft" : "Terkirim"} tone={text(item, "status") === "DRAFT" ? "orange" : "green"} />)}</ScrollView> : <EmptyState message="Tidak ada pemeriksaan yang sesuai filter." />}{canCreate ? <ActionButton onPress={() => router.push("/inspection/new")}>Tambah Pemeriksaan</ActionButton> : null}</Screen><BottomNav current="inspections" role={role} /></>;
}
const styles = StyleSheet.create({ filters: { gap: spacing.sm }, search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12 }, dates: { flexDirection: "row", gap: spacing.sm }, date: { flex: 1 }, list: { gap: spacing.sm, paddingBottom: 8 } });
