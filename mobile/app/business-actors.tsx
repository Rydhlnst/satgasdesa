import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Building2 } from "lucide-react-native";
import { useAuth } from "../src/auth";
import { ActionButton, RowCard } from "../src/components/PimpinanPrimitives";
import { SearchField } from "../src/components/MobilePrimitives";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { getBusinessActors } from "../src/lib/api";
import { displayStatus, text } from "../src/lib/read";
import { colors } from "../src/theme";

export default function BusinessActors() {
  const { role, session } = useAuth(); const router = useRouter(); const [query, setQuery] = useState("");
  const canManage = session?.permissions.includes("BUSINESS_ACTOR_MANAGE") ?? false;
  const actors = useQuery({ queryKey: ["business-actors", query], queryFn: () => getBusinessActors(query.trim() || undefined), enabled: Boolean(role) });
  const { refetch } = actors;
  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));
  if (!role) return null;
  return <><Header role={role} title="Pelaku Usaha" subtitle="Master data pelaku usaha" /><Screen><SearchField value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="Cari nama atau kontak" />{canManage ? <ActionButton onPress={() => router.push("/business-actor/new")}>Tambah pelaku usaha</ActionButton> : null}{actors.isLoading ? <LoadingState /> : actors.isError ? <ErrorState message="Data pelaku usaha tidak dapat dimuat." error={actors.error} onRetry={() => actors.refetch()} /> : actors.data?.actors.length ? actors.data.actors.map((actor) => <RowCard key={text(actor, "id")} onPress={canManage ? () => router.push({ pathname: "/business-actor/edit", params: { id: text(actor, "id"), actorType: text(actor, "actorType"), name: text(actor, "name"), representativeName: text(actor, "representativeName"), contact: text(actor, "contact"), address: text(actor, "address"), notes: text(actor, "notes") } }) : undefined} icon={<Building2 color={colors.primary} size={22} />} title={text(actor, "name")} subtitle={displayStatus(text(actor, "actorType"))} meta={text(actor, "contact", "Tidak ada kontak")} />) : <EmptyState message="Belum ada pelaku usaha." />}</Screen><BottomNav current="profile" role={role} /></>;
}
