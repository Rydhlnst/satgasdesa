import { useRouter } from "expo-router";
import { ClipboardCheck, FileBarChart, FileText, HardHat, Map, MapPinned, ReceiptText, Settings2, ShieldCheck, Users, WalletCards, Wrench } from "lucide-react-native";
import { View } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, Header, Screen } from "../src/components/Screen";
import { ModuleHub, type ModuleItem } from "../src/components/OperationalPrimitives";
import { colors } from "../src/theme";

type Feature = ModuleItem & { permission?: string };

const featureGroups: Array<{ title: string; description: string; items: Feature[] }> = [
  {
    title: "Lapangan",
    description: "Pantau blok, tugas, dan kegiatan di lapangan.",
    items: [
      { label: "Monitoring blok", description: "Status blok dan progres operasional", permission: "BLOCK_READ", icon: <MapPinned color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Peta lapangan", description: "Lihat lokasi dan kondisi blok", permission: "BLOCK_READ", icon: <Map color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Penugasan blok", description: "Tetapkan petugas untuk blok", permission: "FIELD_ASSIGNMENT_MANAGE", icon: <Users color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Pemeriksaan", description: "Temuan kondisi dan tindak lanjut", permission: "INSPECTION_READ", icon: <ShieldCheck color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Tugas lapangan", description: "Pekerjaan dan tenggat per blok", permission: "FIELD_TASK_READ", icon: <ClipboardCheck color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Informasi harian", description: "Catatan aktivitas dan insiden", permission: "DAILY_INFO_READ", icon: <FileText color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Alat berat", description: "Unit, operator, dan status alat", permission: "EXCAVATOR_READ", icon: <HardHat color={colors.warning} size={17} />, onPress: () => undefined },
      { label: "Pekerja lapangan", description: "Data pekerja dan penempatan", permission: "WORKER_READ", icon: <Users color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Pelaku usaha", description: "Data pelaku usaha terkait", permission: "BUSINESS_ACTOR_READ", icon: <Wrench color={colors.primary} size={17} />, onPress: () => undefined },
    ],
  },
  {
    title: "Keuangan",
    description: "Kelola penerimaan, anggaran, dan pertanggungjawaban.",
    items: [
      { label: "Iuran dan pembayaran", description: "Iuran bulanan, tunggakan, dan pembayaran", permission: "DUES_READ", icon: <ReceiptText color={colors.finance} size={17} />, onPress: () => undefined },
      { label: "Anggaran", description: "Alokasi, serapan, dan sisa anggaran", permission: "BUDGET_READ", icon: <FileBarChart color={colors.finance} size={17} />, onPress: () => undefined },
      { label: "Kategori keuangan", description: "Master kategori transaksi", permission: "FINANCE_CATEGORY_MANAGE", icon: <Settings2 color={colors.finance} size={17} />, onPress: () => undefined },
      { label: "Kategori anggaran", description: "Master kategori alokasi", permission: "BUDGET_CATEGORY_MANAGE", icon: <Settings2 color={colors.finance} size={17} />, onPress: () => undefined },
      { label: "Pengajuan dana", description: "Pengajuan dan status verifikasi", permission: "FUND_REQUEST_READ", icon: <ClipboardCheck color={colors.finance} size={17} />, onPress: () => undefined },
      { label: "Realisasi anggaran", description: "Bukti dan persetujuan penggunaan dana", permission: "REALIZATION_READ", icon: <FileText color={colors.finance} size={17} />, onPress: () => undefined },
      { label: "Laporan", description: "Ringkasan dan ekspor data", permission: "REPORT_READ", icon: <FileText color={colors.finance} size={17} />, onPress: () => undefined },
    ],
  },
  {
    title: "Administrasi",
    description: "Akun, notifikasi, dan status sinkronisasi.",
    items: [
      { label: "Administrasi pengguna", description: "Pengguna, pengaturan, dan audit", permission: "SETTINGS_MANAGE", icon: <Settings2 color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Notifikasi", description: "Pemberitahuan dan tindak lanjut", icon: <ShieldCheck color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Antrean offline", description: "Data yang menunggu atau gagal dikirim", icon: <Wrench color={colors.primary} size={17} />, onPress: () => undefined },
      { label: "Profil dan keamanan", description: "Akun, kata sandi, dan sesi", icon: <Users color={colors.primary} size={17} />, onPress: () => undefined },
    ],
  },
];

const routeByLabel: Record<string, string> = {
  "Monitoring blok": "/monitoring",
  "Peta lapangan": "/map",
  "Penugasan blok": "/assignments",
  Pemeriksaan: "/inspections",
  "Tugas lapangan": "/tasks",
  "Informasi harian": "/information",
  "Alat berat": "/excavators",
  "Pekerja lapangan": "/workers",
  "Pelaku usaha": "/business-actors",
  "Iuran dan pembayaran": "/finance",
  Anggaran: "/budgets",
  "Kategori keuangan": "/finance-categories",
  "Kategori anggaran": "/budget-categories",
  "Pengajuan dana": "/proposals",
  "Realisasi anggaran": "/realizations",
  Laporan: "/reports",
  "Administrasi pengguna": "/admin",
  Notifikasi: "/notifications",
  "Antrean offline": "/offline-queue",
  "Profil dan keamanan": "/profile",
};

export default function More() {
  const { role, session } = useAuth();
  const router = useRouter();
  if (!role) return null;
  const permissions = new Set(session?.permissions ?? []);
  const visibleGroups = featureGroups.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || role === "PIMPINAN" || permissions.has(item.permission)).map((item) => ({ ...item, onPress: () => router.push(routeByLabel[item.label] as never) })) })).filter((group) => group.items.length);
  return <><Header role={role} title="Semua Fitur" subtitle="Menu disusun berdasarkan kewenangan akun" /><Screen><View style={{ gap: 16 }}>{visibleGroups.map((group) => <ModuleHub key={group.title} title={group.title} description={group.description} items={group.items} />)}</View></Screen><BottomNav current="more" role={role} /></>;
}
