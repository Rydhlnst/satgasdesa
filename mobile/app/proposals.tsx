import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, SlidersHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { useDateRange } from "../src/date-range-provider";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { SelectField } from "../src/components/NativeForm";
import { getBlocks, getBudgetCategories, getFundRequests } from "../src/lib/api";
import { money } from "../src/lib/format";
import { numberValue, text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

const statuses = ["", "DRAFT", "SUBMITTED", "VERIFIED", "APPROVED", "REVISION_REQUIRED", "REJECTED", "CANCELLED"];
const labels = ["Semua", "Draf", "Diajukan", "Diverifikasi", "Sah", "Revisi", "Ditolak", "Dibatalkan"];

function tone(status: string): "green" | "red" | "orange" | "blue" | "gray" {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  if (status === "CANCELLED") return "gray";
  if (status === "VERIFIED") return "blue";
  return "orange";
}

export default function Proposals() {
  const { role, session } = useAuth(); const router = useRouter();
  const { range } = useDateRange(); const periodKey = range.dateFrom.slice(0, 7); const [statusIndex, setStatusIndex] = useState(0); const [query, setQuery] = useState(""); const [filtersOpen, setFiltersOpen] = useState(false); const [categoryId, setCategoryId] = useState(""); const [blockId, setBlockId] = useState(""); const [mine, setMine] = useState(false);
  const categories = useQuery({ queryKey: ["budget-categories", "request-filter"], queryFn: () => getBudgetCategories(), enabled: Boolean(role) });
  const blocks = useQuery({ queryKey: ["blocks", "request-filter"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  const result = useQuery({ queryKey: ["fund-requests", periodKey, range.dateFrom, range.dateTo, statuses[statusIndex], query, categoryId, blockId, mine], queryFn: () => getFundRequests({ periodKey, status: statuses[statusIndex], query: query.trim(), categoryId, blockId, mine: mine ? "true" : "" }), enabled: Boolean(role) });
  if (!role) return null;
  const rows = result.data?.items ?? []; const canCreate = session?.permissions.includes("FUND_REQUEST_CREATE") ?? false;
  const categoryOptions = [{ label: "Semua kategori", value: "" }, ...(categories.data?.categories ?? []).map((item) => ({ label: text(item, "name"), value: text(item, "id") }))];
  const blockOptions = [{ label: "Semua blok", value: "" }, ...(blocks.data?.blocks ?? []).map((item) => ({ label: `${text(item, "code")} · ${text(item, "name")}`, value: text(item, "id") }))];
  return <><Header role={role} title="Pengajuan Dana" subtitle="Alur pengajuan dana dan verifikasi" /><Screen><InteractiveTabs active={statusIndex} items={labels} onChange={setStatusIndex} /><View style={styles.searchRow}><SearchField value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="Cari nomor atau uraian" /><Pressable onPress={() => setFiltersOpen((value) => !value)} style={[styles.filter, filtersOpen && styles.filterActive]}><SlidersHorizontal color={filtersOpen ? "#FFFFFF" : colors.primary} size={17} /></Pressable></View>{filtersOpen ? <View style={styles.filters}><SelectField label="Kategori" value={categoryId} options={categoryOptions} onChange={setCategoryId} /><SelectField label="Blok" value={blockId} options={blockOptions} onChange={setBlockId} /><Pressable onPress={() => setMine((value) => !value)} style={[styles.mine, mine && styles.mineActive]}><Text style={[styles.mineText, mine && styles.mineTextActive]}>Hanya pengajuan saya</Text></Pressable></View> : null}{result.isLoading ? <LoadingState /> : result.isError ? <ErrorState message="Pengajuan dana tidak dapat dimuat." onRetry={() => result.refetch()} /> : rows.length ? <View style={styles.list}>{rows.map((item) => { const request = item.request as Record<string, unknown>; const status = text(request, "status"); return <RowCard key={text(request, "id")} onPress={() => router.push(`/fund-request/${text(request, "id")}`)} icon={<ClipboardCheck color={colors.primary} size={22} />} title={`${text(request, "requestNumber")} · ${text(request, "title")}`} subtitle={`${text(item, "categoryName")}${text(item, "blockCode") ? ` · ${text(item, "blockCode")}` : ""}`} meta={money(numberValue(request, "amount"))} status={status === "APPROVED" ? "SAH" : status} tone={tone(status)} />; })}</View> : <EmptyState message="Belum ada pengajuan dana untuk filter ini." />}{canCreate ? <ActionButton onPress={() => router.push("/fund-request/new")}>Buat Pengajuan Baru</ActionButton> : null}</Screen><BottomNav current="proposals" role={role} /></>;
}

const styles = StyleSheet.create({ period: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md }, label: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, periodInput: { color: colors.text, fontSize: 12, fontWeight: "800", minWidth: 88, paddingVertical: 10, textAlign: "right" }, searchRow: { flexDirection: "row", gap: spacing.sm }, search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, flex: 1, fontSize: 12, paddingHorizontal: 12, paddingVertical: 11 }, filter: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, justifyContent: "center", width: 44 }, filterActive: { backgroundColor: colors.primary }, filters: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: spacing.md, padding: spacing.md }, mine: { alignSelf: "flex-start", borderColor: colors.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 }, mineActive: { backgroundColor: "#EAF1FF", borderColor: colors.primary }, mineText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" }, mineTextActive: { color: colors.primary }, list: { gap: spacing.sm, paddingBottom: 8 } });
