import { ChevronRight, LayoutList, Plus, SlidersHorizontal } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { Badge, BadgeText } from "./ui/badge";
import { Button, ButtonText } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Tabs as UITabs, TabsContent, TabsList, TabsTrigger, TabsTriggerText } from "./ui/tabs";
import { colors, radii, spacing, typography } from "../theme";
import { showActionError } from "../lib/feedback";

export function Tabs({ items, active = 0 }: { items: string[]; active?: number }) {
  return <UITabs value={String(active)} variant="filled"><TabsList className="rounded-xl bg-[#F1F5F9] p-1">{items.map((item, index) => <TabsTrigger key={item} value={String(index)} className="min-h-10 flex-1 rounded-lg px-2"><TabsTriggerText className="text-xs font-bold text-[#6E7785]">{item}</TabsTriggerText></TabsTrigger>)}</TabsList></UITabs>;
}

export function InteractiveTabs({ items, active, onChange, panels }: { items: string[]; active: number; onChange: (index: number) => void; panels?: Partial<Record<number, ReactNode>> }) {
  return <UITabs value={String(active)} onValueChange={(value: string) => onChange(Number(value))} variant="filled"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroller}><TabsList className="rounded-2xl border border-[#DFE4EC] bg-white p-1 shadow-sm">{items.map((item, index) => <TabsTrigger key={item} value={String(index)} className="min-h-11 min-w-20 flex-none rounded-xl px-3 data-[selected=true]:bg-[#E7F0FF] data-[selected=true]:shadow-sm"><TabsTriggerText className="text-xs font-bold text-[#6E7785] data-[selected=true]:text-[#1454C4]">{item}</TabsTriggerText></TabsTrigger>)}</TabsList></ScrollView>{panels ? Object.entries(panels).map(([key, content]) => <TabsContent key={key} value={key} className="p-0 pt-3">{content}</TabsContent>) : null}</UITabs>;
}

export function StatusPill({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "red" | "orange" | "blue" | "gray" }) {
  const style = tone === "green" ? "border-transparent bg-[#E8F7EE]" : tone === "red" ? "border-transparent bg-[#FDECEC]" : tone === "orange" ? "border-transparent bg-[#FFF3DF]" : tone === "blue" ? "border-transparent bg-[#E7F0FF]" : "border-transparent bg-[#F1F5F9]";
  const textStyle = tone === "green" ? "text-[#27834B]" : tone === "red" ? "text-[#C5312C]" : tone === "orange" ? "text-[#D87914]" : tone === "blue" ? "text-[#1454C4]" : "text-[#6E7785]";
  return <Badge variant="outline" className={"rounded-full px-2 py-1 " + style}><BadgeText className={"text-[10px] font-extrabold " + textStyle}>{children}</BadgeText></Badge>;
}

export function WorkflowStatusPill({ status }: { status: string }) { return <StatusPill tone={statusTone(status)}>{status}</StatusPill>; }
export function statusTone(status: string): "green" | "red" | "orange" | "blue" | "gray" {
  const value = status.toLowerCase();
  if (/(reject|tolak|gagal|overdue|tunggak|failed|blocked)/.test(value)) return "red";
  if (/(draft|pending|menunggu|overdue|jatuh tempo)/.test(value)) return "orange";
  if (/(submit|ajukan|verify|verifikasi|sync|sinkron)/.test(value)) return "blue";
  if (/(approve|approved|sah|paid|dibayar|lunas|success|berhasil)/.test(value)) return "green";
  return "gray";
}

export function Card({ children, style }: { children: ReactNode; style?: object }) { return <UICard className="rounded-3xl border-[#DFE4EC] bg-white p-4 shadow-sm" style={[styles.card, style]}>{children}</UICard>; }

export function MetricCard({ label, value, hint, tone = "blue" }: { label: string; value: string; hint?: string; tone?: "green" | "red" | "orange" | "blue" }) {
  const accent = tone === "green" ? colors.finance : tone === "red" ? colors.danger : tone === "orange" ? colors.warning : colors.primary;
  return <UICard className="min-h-28 flex-1 overflow-hidden rounded-3xl border-[#DFE4EC] bg-white p-4 shadow-sm" style={styles.card}><View style={styles.metricHeader}><View style={[styles.metricAccent, { backgroundColor: accent }]} /><View style={[styles.metricDot, { backgroundColor: accent }]} /></View><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>{hint ? <Text style={styles.metricHint}>{hint}</Text> : null}</UICard>;
}

export function FilterChip({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  if (!onPress) return <View style={styles.filterChip}><SlidersHorizontal color={active ? colors.primary : colors.textMuted} size={14} /><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></View>;
  return <Button accessibilityRole="button" onPress={onPress} variant={active ? "secondary" : "outline"} size="sm" className={active ? "min-h-9 rounded-full border-[#1454C4] bg-[#E7F0FF] px-3" : "min-h-9 rounded-full border-[#DFE4EC] bg-white px-3"}><SlidersHorizontal color={active ? colors.primary : colors.textMuted} size={14} /><ButtonText className={active ? "text-xs font-extrabold text-[#1454C4]" : "text-xs font-extrabold text-[#6E7785]"}>{label}</ButtonText></Button>;
}

export function ActionButton({ children, onPress }: { children: ReactNode; onPress: () => void | Promise<void> }) {
  async function handlePress() { try { await onPress(); } catch (error) { showActionError(error); } }
  return <Button accessibilityRole="button" onPress={() => void handlePress()} className="min-h-12 rounded-2xl bg-[#1454C4] shadow-sm" style={styles.actionButton}><Plus color="#FFFFFF" size={18} strokeWidth={2.5} /><ButtonText className="text-sm font-extrabold">{children}</ButtonText></Button>;
}

export function RowCard({ title, subtitle, meta, status, tone = "green", icon, thumbnail, onPress }: { title: string; subtitle?: string; meta?: string; status?: string; tone?: "green" | "red" | "orange" | "blue" | "gray"; icon?: ReactNode; thumbnail?: ReactNode; onPress?: () => void | Promise<void> }) {
  const content = <><View style={styles.rowIcon}>{thumbnail ?? icon}</View><View style={styles.rowCopy}><Text numberOfLines={2} style={styles.rowTitle}>{title}</Text>{subtitle ? <Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text> : null}{meta ? <Text numberOfLines={1} style={styles.rowMeta}>{meta}</Text> : null}</View>{status ? <StatusPill tone={tone}>{status}</StatusPill> : null}{onPress ? <View style={styles.rowArrow}><ChevronRight color={colors.primary} size={17} strokeWidth={2.4} /></View> : null}</>;
  if (!onPress) return <UICard className="min-h-20 flex-row items-center gap-3 rounded-2xl border-[#DFE4EC] bg-white p-3 shadow-sm" style={styles.card}>{content}</UICard>;
  return <Pressable accessibilityRole="button" onPress={() => void onPress()} style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]}><UICard className="min-h-20 flex-row items-center gap-3 rounded-2xl border-[#DFE4EC] bg-white p-3 shadow-sm" style={styles.card}>{content}</UICard></Pressable>;
}

export function SectionTitle({ children, action, icon }: { children: ReactNode; action?: string; icon?: ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionCopy}><View style={styles.sectionIcon}>{icon ?? <LayoutList color={colors.primary} size={16} strokeWidth={2.2} />}</View><Text style={styles.sectionTitle}>{children}</Text></View>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  tabScroller: { width: "100%" },
  card: { elevation: 2, shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  metricHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 9 },
  metricAccent: { borderRadius: radii.pill, height: 5, width: 30 },
  metricDot: { borderRadius: radii.pill, height: 7, opacity: 0.22, width: 7 },
  metricLabel: { color: colors.textMuted, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" },
  metricValue: { color: colors.textStrong, fontSize: 18, fontWeight: "900", marginTop: 4 },
  metricHint: { color: colors.textSubtle, fontSize: typography.micro, marginTop: 3 },
  filterChip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: "row", gap: 5, minHeight: 36, paddingHorizontal: 12 },
  filterText: { color: colors.textMuted, fontSize: typography.caption, fontWeight: "800" },
  filterTextActive: { color: colors.primary },
  actionButton: { elevation: 3, shadowColor: colors.primaryDark, shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } },
  rowPressable: { borderRadius: radii.lg },
  pressed: { opacity: 0.76 },
  rowIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, height: 48, justifyContent: "center", width: 48 },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.textStrong, fontSize: typography.body, fontWeight: "800" },
  rowSubtitle: { color: colors.textMuted, fontSize: typography.caption, marginTop: 4 },
  rowMeta: { color: colors.textMuted, fontSize: typography.micro, marginTop: 4 },
  rowArrow: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.pill, height: 28, justifyContent: "center", width: 28 },
  section: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  sectionCopy: { alignItems: "center", flexDirection: "row", gap: 7 },
  sectionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.sm, height: 28, justifyContent: "center", width: 28 },
  sectionTitle: { color: colors.textStrong, fontSize: typography.section, fontWeight: "800" },
  sectionAction: { color: colors.primary, fontSize: typography.caption, fontWeight: "800" },
});
