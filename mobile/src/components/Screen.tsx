import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, CircleUserRound, ClipboardCheck, CloudOff, FileBarChart, FileText, Home, Inbox, MapPinned, MoreHorizontal, Search, Settings2, ShieldCheck, Truck, TrendingUp, WalletCards, Wifi, WifiOff } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth";
import { getNotifications } from "../lib/api";
import { useOfflineSync } from "../offline/provider";
import { DateRangePicker } from "./DateRangePicker";
import { colors, radii, roleTheme, shadows, spacing, typography, type Role } from "../theme";
import { describeError, showActionError } from "../lib/feedback";
import { Button, ButtonText } from "./ui/button";
import { Spinner } from "./ui/spinner";
import appIcon from "../../assets/icon.png";

export function Screen({ children, refreshing, onRefresh, scroll = true, showDateRange = false }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean; showDateRange?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const sync = useOfflineSync();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const notice = sync.isSyncing ? `${sync.summary.SYNCING + sync.summary.PENDING} data sedang disinkronkan.` : !sync.isOnline ? "Offline — perubahan baru akan dikirim saat koneksi kembali." : sync.summary.BLOCKED ? `${sync.summary.BLOCKED} data perlu diperbaiki. Ketuk untuk melihat detail.` : sync.summary.FAILED ? `${sync.summary.FAILED} data gagal dikirim. Ketuk untuk mencoba lagi.` : sync.summary.PENDING ? `${sync.summary.PENDING} data menunggu sinkronisasi.` : null;
  async function retrySync() { try { await sync.syncNow(true); } catch (error) { showActionError(error, "Sinkronisasi gagal. Periksa koneksi lalu coba lagi."); } }
  const banner = notice ? <Pressable disabled={sync.isSyncing} onPress={() => void (sync.summary.BLOCKED ? router.push("/offline-queue") : retrySync())} style={[styles.syncBanner, sync.summary.FAILED || sync.summary.BLOCKED ? styles.syncBannerFailed : null]}><Text style={styles.syncBannerText}>{sync.isSyncing ? "Menyinkronkan data…" : notice}</Text></Pressable> : null;
  const dateRangeEnabled = showDateRange || DATE_RANGE_ROUTES.includes(pathname);
  const dateRange = dateRangeEnabled ? <DateRangePicker /> : null;
  const content = scroll ? <ScrollView style={{ flex: 1, minHeight: 0 }} automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: 84 + insets.bottom + keyboardHeight }]} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false} refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={Boolean(refreshing)} tintColor={colors.primary} /> : undefined}>{dateRange}{banner}{children}</ScrollView> : <View style={styles.nonScrollContent}>{dateRange}{banner}{children}</View>;
  return <SafeAreaView edges={["bottom"]} style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0} style={{ flex: 1 }}>{content}</KeyboardAvoidingView></SafeAreaView>;
}

const DATE_RANGE_ROUTES = ["/dashboard", "/finance", "/budgets", "/proposals", "/realizations", "/reports", "/tasks", "/inspections", "/information"];

export function Header({ role, title, subtitle }: { role: Role; title: string; subtitle?: string }) {
  const { session } = useAuth();
  const sync = useOfflineSync();
  const router = useRouter();
  const notifications = useQuery({ queryKey: ["notifications", "unread-count"], queryFn: () => getNotifications({ unreadOnly: true, pageSize: 1 }) });
  const theme = roleTheme[role];
  const statusBlocked = Boolean(sync.summary.BLOCKED || sync.summary.FAILED);
  const statusPending = Boolean(sync.summary.PENDING || sync.summary.SYNCING);
  const statusLabel = !sync.isOnline ? "Offline" : statusBlocked ? "Perlu cek" : statusPending ? "Menunggu" : "Online";
  const statusColor = !sync.isOnline || statusBlocked ? colors.danger : statusPending ? colors.warning : colors.success;
  return <><SafeAreaView edges={["top"]} style={[styles.headerSafe, { backgroundColor: theme.header }]}><View style={styles.header}><View style={styles.headerSide}><View style={styles.brandMark}><Image source={appIcon} style={styles.brandImage} accessibilityLabel="Ikon aplikasi SATGAS DESA SEJOLI" alt="Ikon aplikasi SATGAS DESA SEJOLI" /></View><View style={styles.headerCopy}><Text numberOfLines={1} style={styles.headerEyebrow}>SATGAS DESA SEJOLI</Text><Text numberOfLines={1} style={styles.headerTitle}>{theme.label}</Text></View></View><View style={styles.headerActions}><View accessibilityLabel={sync.isOnline ? "Online" : "Offline"} style={[styles.connectionChip, { backgroundColor: sync.isOnline ? "#FFFFFF1A" : "#7F1D1D" }]}>{sync.isOnline ? <Wifi color="#CFF7DC" size={14} /> : <WifiOff color="#FECACA" size={14} />}</View><Pressable accessibilityLabel="Buka notifikasi" accessibilityRole="button" onPress={() => router.push("/notifications")} hitSlop={8} style={styles.bell}><Bell color="#FFFFFF" size={18} />{notifications.data?.total ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notifications.data.total > 9 ? "9+" : notifications.data.total}</Text></View> : null}</Pressable><Pressable accessibilityLabel="Buka profil" accessibilityRole="button" onPress={() => router.push("/profile")} hitSlop={8} style={styles.profileButton}><View style={[styles.avatar, { backgroundColor: theme.soft }]}><Text style={[styles.avatarText, { color: theme.header }]}>{getInitials(session?.user.name)}</Text></View></Pressable></View></View></SafeAreaView><View style={styles.pageBar}><View style={[styles.pageIcon, { backgroundColor: theme.soft }]}>{renderPageIcon(title, theme.accent)}</View><View style={styles.pageCopy}><Text numberOfLines={1} style={styles.pageTitle}>{title}</Text><Text numberOfLines={1} style={styles.pageContext}>{subtitle ?? "Akses operasional berbasis peran"}</Text></View><View accessibilityLabel={`Status data: ${statusLabel}`} style={[styles.pageStatus, { backgroundColor: statusColor === colors.success ? colors.successSoft : statusColor === colors.warning ? colors.warningSoft : colors.dangerSoft }]}>{statusColor === colors.success ? <ShieldCheck color={statusColor} size={13} /> : <CloudOff color={statusColor} size={13} />}<Text style={[styles.pageStatusText, { color: statusColor }]}>{statusLabel}</Text></View></View></>;
}

export const AppHeader = Header;

function getInitials(name?: string) { const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []; return (parts.slice(0, 2).map((part) => part[0]).join("") || "U").toUpperCase(); }

function renderPageIcon(title: string, color: string) {
  const value = title.toLowerCase();
  const props = { color, size: 18, strokeWidth: 2.2 };
  if (value.includes("dashboard")) return <Home {...props} />;
  if (value.includes("monitor") || value.includes("blok") || value.includes("peta")) return <MapPinned {...props} />;
  if (value.includes("keuangan") || value.includes("iuran") || value.includes("transaksi")) return <WalletCards {...props} />;
  if (value.includes("anggaran") || value.includes("budget")) return <FileBarChart {...props} />;
  if (value.includes("pengajuan")) return <ClipboardCheck {...props} />;
  if (value.includes("realisasi")) return <TrendingUp {...props} />;
  if (value.includes("laporan")) return <FileText {...props} />;
  if (value.includes("excavator")) return <Truck {...props} />;
  if (value.includes("pemeriksaan")) return <ShieldCheck {...props} />;
  if (value.includes("profil") || value.includes("admin") || value.includes("pengaturan")) return <Settings2 {...props} />;
  return <Activity {...props} />;
}

export function LoadingState() { return <View style={styles.state}><View style={styles.stateIcon}><Spinner color={colors.primary} size="small" /><Activity color={colors.primary} size={18} /></View><Text style={styles.muted}>Memuat data…</Text></View>; }
export function ErrorState({ message, error, onRetry }: { message: string; error?: unknown; onRetry: () => void | Promise<unknown> }) {
  async function retry() { try { await onRetry(); } catch (error) { showActionError(error, "Data belum dapat dimuat. Periksa koneksi lalu coba lagi."); } }
  const details = describeError(error, message);
  return <View style={styles.state}><View style={[styles.stateIcon, styles.stateIconError]}><CloudOff color={colors.danger} size={22} /></View><Text style={styles.errorTitle}>{details.title}</Text><Text style={styles.errorReason}>{details.reason}</Text><Text style={styles.muted}>{details.nextStep}</Text>{details.requestId ? <Text style={styles.errorDiagnostic}>ID dukungan: {details.requestId}{details.appRevision && details.appRevision !== "unknown" ? ` · Revisi ${details.appRevision}` : ""}</Text> : null}<Button onPress={() => void retry()} className="min-h-11 rounded-xl bg-[#1454C4] px-4"><ButtonText>Coba lagi</ButtonText></Button></View>;
}
export function InlineError({ message, error }: { message: string; error?: unknown }) {
  const details = describeError(error, message);
  return <View style={styles.inlineError}><Text style={styles.inlineErrorTitle}>{details.title}</Text><Text style={styles.inlineErrorReason}>{details.reason}</Text><Text style={styles.inlineErrorNext}>{details.nextStep}</Text>{details.requestId ? <Text style={styles.errorDiagnostic}>ID dukungan: {details.requestId}</Text> : null}</View>;
}
export function EmptyState({ message, title, description, action }: { message?: string; title?: string; description?: string; action?: { label: string; onPress: () => void } }) { return <View style={[styles.state, styles.emptyState]}><View style={styles.stateIcon}><Inbox color={colors.textSubtle} size={22} /></View><Text style={styles.emptyTitle}>{title ?? message ?? "Belum ada data"}</Text>{description ? <Text style={styles.muted}>{description}</Text> : null}{action ? <Button accessibilityLabel={action.label} onPress={action.onPress} variant="outline" className="min-h-11 rounded-xl border-[#D9E1EE] bg-[#EAF2FF] px-4"><ButtonText className="text-xs font-extrabold text-[#1454C4]">{action.label}</ButtonText></Button> : null}</View>; }
export function BottomNav({ role, current }: { role: Role; current: string }) {
  const insets = useSafeAreaInsets();
  const navStyle = [styles.nav, { paddingBottom: Math.max(insets.bottom, 8), minHeight: 62 + insets.bottom }];
  if (role === "PIMPINAN") return <View style={navStyle}><NavItem icon={Home} label="Beranda" active={current === "dashboard"} href="/dashboard" /><NavItem icon={MapPinned} label="Monitoring" active={current === "monitoring"} href="/monitoring" /><NavItem icon={WalletCards} label="Keuangan" active={current === "finance"} href="/finance" /><NavItem icon={Search} label="Anggaran" active={current === "budgets"} href="/budgets" /><NavItem icon={MoreHorizontal} label="Semua fitur" active={current === "more" || current === "profile"} href="/more" /></View>;
  if (role === "BENDAHARA") return <View style={navStyle}><NavItem icon={Home} label="Beranda" active={current === "dashboard"} href="/dashboard" /><NavItem icon={WalletCards} label="Keuangan" active={current === "finance"} href="/finance" /><NavItem icon={ClipboardCheck} label="Pengajuan" active={current === "proposals"} href="/proposals" /><NavItem icon={TrendingUp} label="Realisasi" active={current === "realizations" || current === "budgets"} href="/realizations" /><NavItem icon={FileText} label="Laporan" active={current === "reports"} href="/reports" /></View>;
  if (role === "PETUGAS_LAPANGAN") return <View style={navStyle}><NavItem icon={Home} label="Beranda" active={current === "dashboard"} href="/dashboard" /><NavItem icon={FileText} label="Pemeriksaan" active={current === "inspections" || current === "monitoring" || current === "map"} href="/monitoring" /><NavItem icon={MapPinned} label="Alat Berat" active={current === "excavators"} href="/excavators" /><NavItem icon={WalletCards} label="Informasi" active={current === "information"} href="/information" /><NavItem icon={CircleUserRound} label="Profil" active={current === "profile"} href="/profile" /></View>;
  return <View style={navStyle}><NavItem icon={Home} label="Beranda" active={current === "dashboard"} href="/dashboard" /><NavItem icon={MapPinned} label="Keuangan" active={current === "monitoring"} href="/finance" /><NavItem icon={WalletCards} label="Informasi" active={false} href="/information" /><NavItem icon={Search} label="Laporan" active={false} href="/reports" /><NavItem icon={CircleUserRound} label="Akun" active={false} href="/dashboard" /></View>;
}

function NavItem({ label, active, href, icon: Icon }: { label: string; active: boolean; href: "/dashboard" | "/monitoring" | "/finance" | "/information" | "/reports" | "/budgets" | "/proposals" | "/realizations" | "/inspections" | "/excavators" | "/profile" | "/notifications" | "/more"; icon: typeof Home }) {
  const router = useRouter();
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => router.push(href)} style={({ pressed }) => [styles.navItem, pressed && styles.navPressed]}><View style={[styles.navIcon, active && styles.navIconActive]}><Icon color={active ? colors.primary : colors.textMuted} size={18} /></View><Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.page, flex: 1 },
  content: { gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  nonScrollContent: { flex: 1, gap: spacing.sm, minHeight: 0, padding: spacing.md, paddingTop: spacing.xs },
  syncBanner: { backgroundColor: colors.warningSoft, borderColor: "#F1C554", borderRadius: radii.md, borderWidth: 1, padding: spacing.sm },
  syncBannerFailed: { backgroundColor: colors.dangerSoft, borderColor: "#EA8D89" },
  syncBannerText: { color: colors.text, fontSize: typography.caption, fontWeight: "700", lineHeight: 16 },
  headerSafe: { borderBottomColor: "#FFFFFF1F", borderBottomWidth: StyleSheet.hairlineWidth, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 7 },
  headerSide: { alignItems: "center", flex: 1, flexDirection: "row", gap: 9, minWidth: 0 },
  brandMark: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 11, height: 34, justifyContent: "center", overflow: "hidden", width: 34 },
  brandImage: { height: 34, width: 34 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerActions: { alignItems: "center", flexDirection: "row", flexShrink: 0, gap: 7, marginLeft: 8 },
  connectionChip: { alignItems: "center", borderColor: "#FFFFFF2A", borderRadius: radii.pill, borderWidth: 1, height: 32, justifyContent: "center", width: 32 },
  bell: { alignItems: "center", backgroundColor: "#FFFFFF12", borderColor: "#FFFFFF2A", borderRadius: radii.pill, borderWidth: 1, height: 34, justifyContent: "center", position: "relative", width: 34 },
  profileButton: { alignItems: "center", minHeight: 44, minWidth: 34, justifyContent: "center" },
  avatar: { alignItems: "center", borderColor: "#FFFFFF55", borderRadius: radii.pill, borderWidth: 2, height: 34, justifyContent: "center", width: 34 },
  avatarText: { fontSize: 11, fontWeight: "900" },
  notificationBadge: { alignItems: "center", backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 10, borderWidth: 1, height: 16, justifyContent: "center", minWidth: 16, paddingHorizontal: 3, position: "absolute", right: -4, top: 2 },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
  headerEyebrow: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  headerTitle: { color: "#FFE34F", fontSize: 9, fontWeight: "900", marginTop: 3 },
  pageBar: { alignItems: "center", backgroundColor: colors.page, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 7 },
  pageIcon: { alignItems: "center", borderRadius: radii.md, height: 36, justifyContent: "center", width: 36 },
  pageCopy: { flex: 1, minWidth: 0 },
  pageTitle: { color: colors.textStrong, fontSize: 18, fontWeight: "900" },
  pageContext: { color: colors.textSubtle, fontSize: typography.micro, fontWeight: "700", marginTop: 2 },
  pageStatus: { alignItems: "center", borderRadius: radii.pill, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  pageStatusText: { color: colors.success, fontSize: typography.micro, fontWeight: "900" },
  pageStatusTextOffline: { color: colors.danger },
  state: { alignItems: "center", gap: spacing.sm, justifyContent: "center", minHeight: 140 },
  emptyState: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  stateIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radii.pill, flexDirection: "row", gap: 6, height: 48, justifyContent: "center", width: 48 },
  emptyTitle: { color: colors.textStrong, fontSize: typography.body, fontWeight: "900", textAlign: "center" },
  stateIconError: { backgroundColor: colors.dangerSoft },
  muted: { color: colors.textMuted, fontSize: typography.body, textAlign: "center" },
  errorTitle: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  errorReason: { color: colors.textStrong, fontSize: typography.body, fontWeight: "700", textAlign: "center" },
  errorDiagnostic: { color: colors.textSubtle, fontSize: typography.caption, textAlign: "center" },
  inlineError: { backgroundColor: colors.dangerSoft, borderColor: "#F1B7B3", borderRadius: radii.md, borderWidth: 1, gap: 3, padding: spacing.sm },
  inlineErrorTitle: { color: colors.danger, fontSize: typography.caption, fontWeight: "900" },
  inlineErrorReason: { color: colors.textStrong, fontSize: typography.caption, fontWeight: "700" },
  inlineErrorNext: { color: colors.textMuted, fontSize: typography.caption },
  nav: { backgroundColor: colors.surface, borderColor: colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", left: 0, paddingBottom: 8, paddingTop: 6, position: "absolute", right: 0, ...shadows.card },
  navItem: { alignItems: "center", flex: 1, gap: 2, minHeight: 48, paddingHorizontal: 2 },
  navPressed: { opacity: 0.72 },
  navIcon: { alignItems: "center", borderRadius: radii.pill, height: 28, justifyContent: "center", width: 40 },
  navIconActive: { backgroundColor: colors.primarySoft },
  navLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "700", textAlign: "center" },
  navActive: { color: colors.primary },
});
