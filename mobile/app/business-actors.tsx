import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Building2 } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { TextInput } from "../src/components/ui/TextInput";

import { useAuth } from "../src/auth";
import { ActionButton, RowCard } from "../src/components/PimpinanPrimitives";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { getBusinessActors } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

export default function BusinessActors() {
  const { role } = useAuth(); const router = useRouter(); const [query, setQuery] = useState("");
  const actors = useQuery({ queryKey: ["business-actors", query], queryFn: () => getBusinessActors(query.trim() || undefined), enabled: Boolean(role) });
  if (!role) return null;
  return <><Header role={role} title="Business Actors" subtitle="Master data pelaku usaha" /><Screen><TextInput value={query} onChangeText={setQuery} placeholder="Cari nama atau kontak" placeholderTextColor={colors.textMuted} style={styles.search} /><ActionButton onPress={() => router.push("/business-actor/new")}>Tambah pelaku usaha</ActionButton>{actors.isLoading ? <LoadingState /> : actors.isError ? <ErrorState message="Data pelaku usaha tidak dapat dimuat." onRetry={() => actors.refetch()} /> : actors.data?.actors.length ? actors.data.actors.map((actor) => <RowCard key={text(actor, "id")} onPress={() => router.push({ pathname: "/business-actor/edit", params: { id: text(actor, "id"), actorType: text(actor, "actorType"), name: text(actor, "name"), representativeName: text(actor, "representativeName"), contact: text(actor, "contact"), address: text(actor, "address"), notes: text(actor, "notes") } })} icon={<Building2 color={colors.primary} size={22} />} title={text(actor, "name")} subtitle={text(actor, "actorType")} meta={text(actor, "contact", "Tidak ada kontak")} />) : <EmptyState message="Belum ada pelaku usaha." />}</Screen><BottomNav current="profile" role={role} /></>;
}

const styles = StyleSheet.create({ search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, marginBottom: spacing.sm, paddingHorizontal: 12, paddingVertical: 11 } });
