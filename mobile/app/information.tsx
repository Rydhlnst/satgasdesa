import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { ActionButton, InteractiveTabs, RowCard } from "../src/components/PimpinanPrimitives";
import { RemoteThumbnail } from "../src/components/RemoteThumbnail";
import { getDailyInformationAttachmentDownloadUrl, getInformationFiltered } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

export default function Information() {
  const { role, session } = useAuth(); const router = useRouter(); const [tab, setTab] = useState(0); const [statusTab, setStatusTab] = useState(0); const [queryText, setQueryText] = useState(""); const [reportedDate, setReportedDate] = useState("");
  const category = tab === 1 ? "ACTIVITY" : tab === 2 ? "COMPLAINT" : tab === 3 ? "NOTICE" : "";
  const status = statusTab === 1 ? "NEW" : statusTab === 2 ? "IN_PROGRESS" : statusTab === 3 ? "COMPLETED" : "";
  const filters = { ...(category ? { category } : {}), ...(status ? { status } : {}), ...(queryText.trim() ? { query: queryText.trim() } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(reportedDate) ? { reportedDate } : {}), ...(role === "PETUGAS_LAPANGAN" ? { mine: "true" } : {}) };
  const query = useQuery({ queryKey: ["information", filters], queryFn: () => getInformationFiltered(filters), enabled: Boolean(role) });
  if (!role) return null;
  const rows = query.data?.rows ?? [];
  const visibleRows = rows;
  const canCreate = session?.permissions.includes("DAILY_INFO_CREATE");
  return <><Header role={role} title="Informasi Harian" subtitle={role === "PETUGAS_LAPANGAN" ? "Riwayat informasi saya" : "Insiden dan aktivitas lapangan"} /><Screen><InteractiveTabs active={tab} items={["Semua", "Kegiatan", "Keluhan", "Pemberitahuan"]} onChange={setTab} /><InteractiveTabs active={statusTab} items={["Semua", "Baru", "Proses", "Selesai"]} onChange={setStatusTab} /><TextInput value={queryText} onChangeText={setQueryText} placeholder="Cari informasi..." placeholderTextColor={colors.textMuted} style={styles.search} /><TextInput value={reportedDate} onChangeText={setReportedDate} placeholder="Filter tanggal: YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.search} />{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Informasi harian tidak dapat dimuat." onRetry={() => query.refetch()} /> : <ScrollView contentContainerStyle={styles.list}>{visibleRows.map((item) => <InformationRow key={text(item, "id")} item={item} onPress={() => router.push(`/information/${text(item, "id")}`)} />)}</ScrollView>}{canCreate ? <ActionButton onPress={() => router.push("/information/new")}>Buat Informasi</ActionButton> : null}</Screen><BottomNav current="information" role={role} /></>;
}
function InformationRow({ item, onPress }: { item: Record<string, unknown>; onPress: () => void }) { const id = text(item, "id"); const photoKey = text(item, "coverPhotoKey"); return <RowCard onPress={onPress} thumbnail={photoKey ? <RemoteThumbnail queryKey={["information-photo", id, photoKey]} loadUrl={async () => (await getDailyInformationAttachmentDownloadUrl({ id, storageKey: photoKey })).downloadUrl} /> : undefined} icon={text(item, "priority") === "URGENT" ? <AlertCircle color={colors.danger} size={22} /> : <FileText color={colors.primary} size={22} />} meta={`${text(item, "category")} · ${text(item, "reportedAt")}`} status={text(item, "status")} title={text(item, "description", "Informasi lapangan")} subtitle={`Blok: ${text(item, "blockId")}`} tone={text(item, "priority") === "URGENT" ? "red" : "orange"} />; }
const styles = StyleSheet.create({ list: { gap: spacing.sm, paddingBottom: 8 }, search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 42, paddingHorizontal: 12 } });
