import { showActionError } from "../../src/lib/feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert as Alert } from "../../src/lib/feedback";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { Header, Screen } from "../../src/components/Screen";
import { passwordSchema } from "../../src/form-schemas";
import { changePassword } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ProfileSecurity() {
  const { role, signOut } = useAuth();
  const router = useRouter();
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "", revokeOtherSessions: "yes" } });
  if (!role) return null;
  async function submit(values: PasswordValues) {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword, revokeOtherSessions: values.revokeOtherSessions === "yes" });
      Alert.alert("Kata sandi diubah", "Masuk kembali di perangkat lain jika sesinya dicabut.", [{ text: "Selesai", onPress: () => router.back() }]);
    } catch (error) { showActionError(error, "Coba lagi."); }
  }
  function confirmSignOut() {
    Alert.alert("Keluar dari akun?", "Anda harus masuk kembali untuk mengakses data operasional.", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => void signOut().catch((error) => showActionError(error, "Coba lagi.")) },
    ]);
  }
  return <><Header role={role} title="Kata sandi dan sesi" subtitle="Amankan akun ini" /><Screen><View style={styles.card}><Text style={styles.copy}>Gunakan kata sandi yang unik. Anda dapat mencabut sesi aktif lain setelah memperbarui kata sandi.</Text><InputField name="currentPassword" label="Kata sandi saat ini" required register={form.register} errors={form.formState.errors} secureTextEntry /><InputField name="newPassword" label="Kata sandi baru" required register={form.register} errors={form.formState.errors} secureTextEntry /><InputField name="confirmPassword" label="Konfirmasi kata sandi baru" required register={form.register} errors={form.formState.errors} secureTextEntry /><SelectField label="Sesi lainnya" required error={form.formState.errors.revokeOtherSessions?.message} value={form.watch("revokeOtherSessions")} options={[{ label: "Cabut sesi", value: "yes" }, { label: "Tetap aktif", value: "no" }]} onChange={(value) => form.setValue("revokeOtherSessions", value as "yes" | "no", { shouldValidate: true })} /><SubmitButton label="Ubah kata sandi" loading={form.formState.isSubmitting} onPress={() => void form.handleSubmit(submit)()} /></View><Pressable accessibilityRole="button" onPress={confirmSignOut} style={styles.signOut}><Text style={styles.signOutText}>Keluar dari perangkat ini</Text></Pressable></Screen></>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: spacing.md, padding: spacing.md }, copy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, signOut: { alignItems: "center", borderColor: "#F4B4B0", borderRadius: 10, borderWidth: 1, padding: 13 }, signOutText: { color: colors.danger, fontSize: 12, fontWeight: "900" } });
