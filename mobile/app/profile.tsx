import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { LogOut, MapPin, Pencil, ShieldCheck } from "lucide-react-native";
import { z } from "zod";

import { useAuth } from "../src/auth";
import { BottomNav, ErrorState, LoadingState, Screen } from "../src/components/Screen";
import { InputField, SubmitButton } from "../src/components/NativeForm";
import { getAssignedBlocks, getProfile, updateProfile } from "../src/lib/api";
import { colors, spacing } from "../src/theme";

const profileSchema = z.object({ name: z.string().trim().min(2, "Name must contain at least 2 characters."), phone: z.string().trim().min(6, "Enter a valid phone number.").max(30).or(z.literal("")), image: z.string().trim().url("Enter a valid image URL.").or(z.literal("")) });
type ProfileValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { role, session, signOut, refreshSession } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile, enabled: Boolean(role) });
  const assignments = useQuery({ queryKey: ["assigned-blocks"], queryFn: getAssignedBlocks, enabled: role === "PETUGAS_LAPANGAN" });
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: "", phone: "", image: "" } });

  useEffect(() => { const item = profile.data?.profile; if (item) form.reset({ name: item.name, phone: item.phone ?? "", image: item.image ?? "" }); }, [form, profile.data]);
  if (!role) return null;

  async function save(values: ProfileValues) {
    try {
      await updateProfile(values);
      await refreshSession();
      await profile.refetch();
      setEditing(false);
      Alert.alert("Profile updated", "Your account details have been saved.");
    } catch (error) { Alert.alert("Unable to update profile", error instanceof Error ? error.message : "Try again."); }
  }

  return <><View style={styles.header}><Text style={styles.headerTitle}>PROFILE</Text><Text style={styles.headerSubtitle}>Account and access settings</Text></View><Screen>{profile.isLoading ? <LoadingState /> : profile.isError ? <ErrorState message="Profile could not be loaded." onRetry={() => void profile.refetch()} /> : <><View style={styles.hero}><ShieldCheck color="#FFFFFF" size={28} /><View><Text style={styles.name}>{profile.data?.profile.name ?? session?.user.name}</Text><Text style={styles.role}>{role.replaceAll("_", " ")}</Text><Text style={styles.email}>{profile.data?.profile.email ?? session?.user.email}</Text></View></View>{editing ? <View style={styles.card}><Text style={styles.title}>Edit profile</Text><InputField name="name" label="Name" register={form.register} errors={form.formState.errors} /><InputField name="phone" label="Phone number" keyboardType="numeric" register={form.register} errors={form.formState.errors} /><InputField name="image" label="Avatar image URL (optional)" register={form.register} errors={form.formState.errors} /><View style={styles.actions}><Pressable onPress={() => setEditing(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><View style={styles.save}><SubmitButton label="Save profile" loading={form.formState.isSubmitting} onPress={() => void form.handleSubmit(save)()} /></View></View></View> : <View style={styles.card}><Text style={styles.title}>Account details</Text><Detail label="Phone" value={profile.data?.profile.phone ?? "Not set"} /><Detail label="Avatar" value={profile.data?.profile.image ? "Configured" : "Not configured"} /><Pressable onPress={() => setEditing(true)} style={styles.outline}><Pencil color={colors.primary} size={16} /><Text style={styles.outlineText}>Edit profile</Text></Pressable></View>}<View style={styles.card}><Text style={styles.title}>Security</Text><Text style={styles.copy}>Change your password from this device or request a secure reset email.</Text><Pressable onPress={() => router.push("/profile/security")} style={styles.outline}><ShieldCheck color={colors.primary} size={16} /><Text style={styles.outlineText}>Password and sessions</Text></Pressable></View>{role === "PETUGAS_LAPANGAN" ? <View style={styles.card}><Text style={styles.title}>Active block assignments</Text>{assignments.isLoading ? <LoadingState /> : (assignments.data?.blocks ?? []).length ? assignments.data?.blocks.map((block) => <View key={block.id} style={styles.row}><MapPin color={colors.primary} size={16} /><Text style={styles.value}>{block.code} · {block.name}</Text></View>) : <Text style={styles.empty}>No blocks have been assigned.</Text>}</View> : null}<Pressable onPress={() => void signOut()} style={styles.signOut}><LogOut color={colors.danger} size={17} /><Text style={styles.signOutText}>Sign out</Text></Pressable></>}</Screen><BottomNav current="profile" role={role} /></>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }

const styles = StyleSheet.create({ header: { backgroundColor: colors.primaryDark, gap: 3, paddingHorizontal: spacing.md, paddingVertical: 14 }, headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, headerSubtitle: { color: "#DCE7FF", fontSize: 11 }, hero: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 16, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, name: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" }, role: { color: "#FFE34F", fontSize: 10, fontWeight: "900", marginTop: 4 }, email: { color: "#DCE7FF", fontSize: 11, marginTop: 3 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, title: { color: colors.text, fontSize: 13, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 }, detail: { borderTopColor: colors.border, borderTopWidth: 1, gap: 3, paddingTop: spacing.sm }, detailLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700" }, row: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 5 }, value: { color: colors.text, fontSize: 12 }, empty: { color: colors.textMuted, fontSize: 11 }, outline: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: spacing.sm, padding: 12 }, outlineText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, actions: { flexDirection: "row", gap: spacing.sm }, cancel: { alignItems: "center", borderColor: colors.border, borderRadius: 10, borderWidth: 1, justifyContent: "center", paddingHorizontal: 16 }, cancelText: { color: colors.text, fontSize: 12, fontWeight: "800" }, save: { flex: 1 }, signOut: { alignItems: "center", borderColor: "#F4B4B0", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", padding: 13 }, signOutText: { color: colors.danger, fontSize: 12, fontWeight: "900" } });
