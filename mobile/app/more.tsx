import { useRouter } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import { View } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, Header, Screen } from "../src/components/Screen";
import { Button, ButtonText } from "../src/components/ui/button";
import { colors } from "../src/theme";

const features = [
  ["Pengajuan dana", "/proposals"],
  ["Realisasi anggaran", "/realizations"],
  ["Laporan", "/reports"],
  ["Pemeriksaan lapangan", "/inspections"],
  ["Tugas lapangan", "/tasks"],
  ["Penugasan blok", "/assignments"],
  ["Alat berat", "/excavators"],
  ["Informasi lapangan", "/information"],
  ["Pekerja lapangan", "/workers"],
  ["Administrasi", "/admin"],
  ["Profil dan keamanan", "/profile"],
] as const;

export default function More() {
  const { role } = useAuth();
  const router = useRouter();
  if (!role) return null;
  return <><Header role={role} title="Semua Fitur" subtitle="Akses lengkap sesuai kewenangan akun" /><Screen><View style={{ gap: 10 }}>{features.map(([label, href]) => <Button key={href} accessibilityLabel={`Buka ${label}`} onPress={() => router.push(href)} variant="outline" className="min-h-12 rounded-xl border-[#D9E1EE] bg-white px-4"><MoreHorizontal color={colors.primary} size={17} /><ButtonText className="flex-1 text-left text-sm font-extrabold text-[#1454C4]">{label}</ButtonText></Button>)}</View></Screen><BottomNav current="more" role={role} /></>;
}
