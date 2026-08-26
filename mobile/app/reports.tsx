import { useQuery } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { BarChart3, CalendarRange, ChevronRight, Download, FileBarChart, FileText, ReceiptText, TrendingUp } from "lucide-react-native";
import { useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { useDateRange } from "../src/date-range-provider";
import { apiBaseUrl, getReport, getToken } from "../src/lib/api";
import { money } from "../src/lib/format";
import { numberValue, text } from "../src/lib/read";
import { showActionError } from "../src/lib/feedback";
import { colors, spacing } from "../src/theme";

type Section = "finance" | "dues" | "blocks" | "realization" | "information";
type ReportIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
type ReportSection = { key: Section; title: string; description: string; icon: ReportIcon; color: string; softColor: string };

const reportSections: ReportSection[] = [
  { key: "finance", title: "Keuangan", description: "Arus kas dan rekonsiliasi", icon: FileBarChart, color: colors.success, softColor: "#EAF8EF" },
  { key: "dues", title: "Iuran", description: "Kewajiban, pembayaran, dan tunggakan", icon: ReceiptText, color: "#148A78", softColor: "#E7F7F3" },
  { key: "blocks", title: "Operasional blok", description: "Pemeriksaan dan pergerakan unit", icon: BarChart3, color: colors.primary, softColor: "#EAF1FF" },
  { key: "realization", title: "Realisasi", description: "Alokasi, serapan, dan sisa dana", icon: TrendingUp, color: colors.warning, softColor: "#FFF3DF" },
  { key: "information", title: "Informasi", description: "Informasi harian dan tindak lanjut", icon: FileText, color: "#8B4BD8", softColor: "#F1E9FF" },
];

export default function Reports() {
  const { role } = useAuth();
  const { range } = useDateRange();
  const periodKey = range.dateFrom.slice(0, 7);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Section>("finance");
  const query = useQuery({ queryKey: ["report", periodKey], queryFn: () => getReport(periodKey), enabled: Boolean(role) });
  const report = query.data?.report ?? {};
  const financial = (report.financial ?? {}) as Record<string, unknown>;
  const budget = (report.budget ?? {}) as Record<string, unknown>;
  const operational = (report.operational ?? {}) as Record<string, unknown>;

  async function exportReport(format: "pdf" | "xlsx") {
    setExporting(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ format, period: text(report, "periodKey", ""), dateFrom: range.dateFrom, dateTo: range.dateTo });
      const mimeType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const response = await fetch(`${apiBaseUrl()}/api/mobile/reports/export?${params.toString()}`, { headers: { Accept: mimeType, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!response.ok) throw new Error("Laporan tidak dapat diekspor.");
      const contentType = (response.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
      if (contentType && contentType !== mimeType) throw new Error("Server mengembalikan format laporan yang tidak sesuai.");
      const period = text(report, "periodKey", "laporan").replace(/[^a-zA-Z0-9-]/g, "-");
      const file = new File(Paths.cache, `satgas-${period}.${format}`);
      if (file.exists) file.delete();
      file.create({ intermediates: true });
      file.write(new Uint8Array(await response.arrayBuffer()));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { dialogTitle: `Bagikan laporan ${period}`, mimeType, UTI: format === "pdf" ? "com.adobe.pdf" : "org.openxmlformats.spreadsheetml.sheet" });
      else throw new Error("Fitur berbagi file tidak tersedia di perangkat ini.");
    } catch (error) {
      showActionError(error, "Laporan tidak dapat diekspor. Periksa koneksi lalu coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  if (!role) return null;
  return <><Header role={role} title="Laporan" subtitle="Ringkasan operasional dan keuangan" /><Screen>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Laporan tidak dapat dimuat." onRetry={() => void query.refetch()} /> : <>
    <View style={styles.hero}>
      <View style={styles.heroIcon}><CalendarRange color="#FFFFFF" size={22} strokeWidth={1.8} /></View>
      <View style={styles.heroCopy}><Text style={styles.heroEyebrow}>LAPORAN TERPADU</Text><Text style={styles.heroTitle}>Ringkasan kinerja</Text><Text style={styles.heroDate}>{range.dateFrom} — {range.dateTo}</Text></View>
    </View>
    <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Jenis laporan</Text><Text style={styles.sectionHint}>Pilih ringkasan yang ingin ditinjau</Text></View><Text style={styles.sectionCount}>{reportSections.length} tampilan</Text></View>
    <View style={styles.optionList}>{reportSections.map((section) => <ReportOption key={section.key} section={section} selected={selected === section.key} onPress={() => setSelected(section.key)} financial={financial} budget={budget} operational={operational} />)}</View>
    <ReportDetail section={selected} financial={financial} budget={budget} operational={operational} />
    <View style={styles.exportCard}><View style={styles.exportCopy}><Text style={styles.exportTitle}>Simpan laporan</Text><Text style={styles.exportHint}>Gunakan rentang tanggal terpilih</Text></View><View style={styles.exportActions}><ExportButton label="PDF" icon={FileText} disabled={exporting} onPress={() => void exportReport("pdf")} /><ExportButton label="Excel" icon={Download} disabled={exporting} onPress={() => void exportReport("xlsx")} /></View></View>
  </>}</Screen><BottomNav current="reports" role={role} /></>;
}

function ReportOption({ section, selected, onPress, financial, budget, operational }: { section: ReportSection; selected: boolean; onPress: () => void; financial: Record<string, unknown>; budget: Record<string, unknown>; operational: Record<string, unknown> }) {
  const Icon = section.icon;
  const summary = section.key === "finance" ? `${money(numberValue(financial, "income"))} pemasukan` : section.key === "dues" ? `${money(numberValue(financial, "paymentsReceived"))} diterima` : section.key === "blocks" ? `${numberValue(operational, "inspections")} pemeriksaan` : section.key === "realization" ? `${numberValue(budget, "absorptionPercentage").toFixed(2)}% serapan` : `${numberValue(operational, "openInformation")} terbuka`;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><View style={[styles.optionIcon, { backgroundColor: section.softColor }]}><Icon color={section.color} size={20} strokeWidth={1.9} /></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>{section.title}</Text><Text style={styles.optionDescription}>{section.description}</Text></View><View style={styles.optionMeta}><Text style={[styles.optionSummary, { color: section.color }]}>{summary}</Text><ChevronRight color={selected ? section.color : colors.textMuted} size={17} /></View></Pressable>;
}

function ReportDetail({ section, financial, budget, operational }: { section: Section; financial: Record<string, unknown>; budget: Record<string, unknown>; operational: Record<string, unknown> }) {
  const meta = reportSections.find((item) => item.key === section) ?? reportSections[0];
  const Icon = meta.icon;
  const rows = section === "finance" ? [["Saldo awal", money(numberValue(financial, "openingBalance"))], ["Pemasukan", money(numberValue(financial, "income"))], ["Pengeluaran", money(numberValue(financial, "expenses"))], ["Saldo akhir", money(numberValue(financial, "closingBalance"))]] : section === "dues" ? [["Kewajiban", money(numberValue(financial, "duesObligation"))], ["Pembayaran diterima", money(numberValue(financial, "paymentsReceived"))], ["Tunggakan", money(numberValue(financial, "receivables"))]] : section === "realization" ? [["Total alokasi", money(numberValue(budget, "allocation"))], ["Realisasi sah", money(numberValue(budget, "realization"))], ["Sisa alokasi", money(numberValue(budget, "remainingAllocation"))], ["Serapan", `${numberValue(budget, "absorptionPercentage").toFixed(2)}%`]] : section === "blocks" ? [["Pemeriksaan", String(numberValue(operational, "inspections"))], ["Pergerakan excavator", String(numberValue(operational, "excavatorMovements"))]] : [["Informasi", String(numberValue(operational, "totalInformation"))], ["Keluhan", String(numberValue(operational, "complaints"))], ["Insiden", String(numberValue(operational, "incidents"))], ["Masih terbuka", String(numberValue(operational, "openInformation"))]];
  return <View style={styles.detail}><View style={styles.detailHeader}><View style={[styles.detailIcon, { backgroundColor: meta.softColor }]}><Icon color={meta.color} size={18} /></View><View><Text style={styles.detailEyebrow}>RINCIAN</Text><Text style={styles.detailTitle}>{meta.title}</Text></View></View>{rows.map(([label, value], index) => <View key={label} style={[styles.detailRow, index < rows.length - 1 && styles.detailDivider]}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>)}</View>;
}

function ExportButton({ label, icon: Icon, disabled, onPress }: { label: string; icon: ReportIcon; disabled: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.exportButton, disabled && styles.exportButtonDisabled]}><Icon color={colors.primary} size={16} /><Text style={styles.exportButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 18, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  heroIcon: { alignItems: "center", backgroundColor: "#FFFFFF22", borderColor: "#FFFFFF44", borderRadius: 12, borderWidth: 1, height: 48, justifyContent: "center", width: 48 },
  heroCopy: { flex: 1, gap: 3 }, heroEyebrow: { color: "#BFD2FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" }, heroDate: { color: "#DCE7FF", fontSize: 11 },
  sectionHeading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900" }, sectionHint: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, sectionCount: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, optionList: { gap: spacing.xs },
  option: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, optionSelected: { borderColor: colors.primary, borderWidth: 1.5 }, optionIcon: { alignItems: "center", borderRadius: 10, height: 42, justifyContent: "center", width: 42 }, optionCopy: { flex: 1, gap: 3 }, optionTitle: { color: colors.text, fontSize: 12, fontWeight: "900" }, optionDescription: { color: colors.textMuted, fontSize: 10 }, optionMeta: { alignItems: "flex-end", gap: 4, maxWidth: 112 }, optionSummary: { fontSize: 9, fontWeight: "900", textAlign: "right" },
  detail: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, padding: spacing.md }, detailHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.sm }, detailIcon: { alignItems: "center", borderRadius: 9, height: 34, justifyContent: "center", width: 34 }, detailEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: "900", letterSpacing: 1 }, detailTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 2 }, detailRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }, detailDivider: { borderBottomColor: colors.border, borderBottomWidth: 1 }, detailLabel: { color: colors.textMuted, fontSize: 11 }, detailValue: { color: colors.text, fontSize: 12, fontWeight: "900" },
  exportCard: { backgroundColor: "#F7F9FC", borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, exportCopy: { gap: 3 }, exportTitle: { color: colors.text, fontSize: 13, fontWeight: "900" }, exportHint: { color: colors.textMuted, fontSize: 10 }, exportActions: { flexDirection: "row", gap: spacing.sm }, exportButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: 9, borderWidth: 1, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44 }, exportButtonDisabled: { opacity: 0.55 }, exportButtonText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
});
