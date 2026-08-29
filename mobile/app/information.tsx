import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { TextInput } from "../src/components/ui/TextInput";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ErrorText } from "../src/components/NativeForm";
import { isValidDate } from "../src/date-range";
import { useDateRange } from "../src/date-range-provider";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { RemoteThumbnail } from "../src/components/RemoteThumbnail";
import { getDailyInformationAttachmentDownloadUrl, getInformationFiltered } from "../src/lib/api";
import { displayStatus, text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";
import { SearchField } from "../src/components/MobilePrimitives";

export default function Information() {
  const { role, session } = useAuth(); const router = useRouter(); const { range } = useDateRange(); const [tab, setTab] = useState(0); const [statusTab, setStatusTab] = useState(0); const [queryText, setQueryText] = useState(""); const [reportedDate, setReportedDate] = useState(""); const [reportedDateError, setReportedDateError] = useState("");
  const category = tab === 1 ? "ACTIVITY" : tab === 2 ? "COMPLAINT" : tab === 3 ? "NOTICE" : "";
  const status = statusTab === 1 ? "NEW" : statusTab === 2 ? "IN_PROGRESS" : statusTab === 3 ? "COMPLETED" : "";
  const filters = { ...(category ? { category } : {}), ...(status ? { status } : {}), ...(queryText.trim() ? { query: queryText.trim() } : {}), ...(reportedDate && !reportedDateError ? { reportedDate } : {}), ...(role === "PETUGAS_LAPANGAN" ? { mine: "true" } : {}) };
  const query = useQuery({ queryKey: ["information", range.dateFrom, range.dateTo, filters], queryFn: () => getInformationFiltered(filters), enabled: Boolean(role) });
  if (!role) return null;
  const rows = query.data?.rows ?? [];
  const visibleRows = rows;
  const canCreate = session?.permissions.includes("DAILY_INFO_CREATE");
  return <><Header role={role} title="Informasi Harian" subtitle={role === "PETUGAS_LAPANGAN" ? "Riwayat informasi saya" : "Insiden dan aktivitas lapangan"} /><Screen><InteractiveTabs active={tab} items={["Semua", "Kegiatan", "Keluhan", "Pemberitahuan"]} onChange={setTab} /><InteractiveTabs active={statusTab} items={["Semua", "Baru", "Proses", "Selesai"]} onChange={setStatusTab} /><SearchField value={queryText} onChangeText={setQueryText} onClear={() => setQueryText("")} placeholder="Cari informasi..." /><TextInput maxLength={10} value={reportedDate} onChangeText={(value) => { setReportedDate(value); setReportedDateError(value && !isValidDate(value) ? "Gunakan tanggal valid dengan format YYYY-MM-DD." : ""); }} placeholder="Filter tanggal: YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={[styles.search, reportedDateError ? styles.invalid : undefined]} /><ErrorText value={reportedDateError} />{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Informasi harian tidak dapat dimuat." onRetry={() => query.refetch()} /> : <View style={styles.list}>{visibleRows.length ? visibleRows.map((item) => <InformationRow key={text(item, "id")} item={item} onPress={() => router.push(`/information/${text(item, "id")}`)} />) : <EmptyState title="Belum ada informasi" description={queryText || reportedDate ? "Tidak ada informasi yang cocok dengan filter saat ini." : "Buat informasi lapangan pertama untuk mulai mencatat kejadian dan aktivitas."} action={canCreate ? { label: "Buat informasi", onPress: () => router.push("/information/new") } : undefined} />}</View>}{canCreate ? <ActionButton onPress={() => router.push("/information/new")}>Buat Informasi</ActionButton> : null}</Screen><BottomNav current="information" role={role} /></>;
}
function InformationRow({ item, onPress }: { item: Record<string, unknown>; onPress: () => void }) { const id = text(item, "id"); const photoKey = text(item, "coverPhotoKey"); return <RowCard onPress={onPress} thumbnail={photoKey ? <RemoteThumbnail queryKey={["information-photo", id, photoKey]} loadUrl={async () => (await getDailyInformationAttachmentDownloadUrl({ id, storageKey: photoKey })).downloadUrl} /> : undefined} icon={text(item, "priority") === "URGENT" ? <AlertCircle color={colors.danger} size={22} /> : <FileText color={colors.primary} size={22} />} meta={`${displayStatus(text(item, "category"))} · ${text(item, "reportedAt")}`} status={text(item, "status")} title={text(item, "description", "Informasi lapangan")} subtitle={`Blok: ${text(item, "blockId")}`} tone={text(item, "priority") === "URGENT" ? "red" : "orange"} />; }
const styles = StyleSheet.create({ list: { gap: spacing.sm, paddingBottom: 8 }, search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 42, paddingHorizontal: 12 }, invalid: { borderColor: colors.danger } });
