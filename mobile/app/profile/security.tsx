import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
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
      Alert.alert("Password changed", "Sign in again on other devices if their sessions were revoked.", [{ text: "Done", onPress: () => router.back() }]);
    } catch (error) { Alert.alert("Unable to change password", error instanceof Error ? error.message : "Try again."); }
  }
  return <><Header role={role} title="Password and sessions" subtitle="Secure this account" /><Screen><View style={styles.card}><Text style={styles.copy}>Use a unique password. You can revoke other active sessions after updating it.</Text><InputField name="currentPassword" label="Current password" required register={form.register} errors={form.formState.errors} secureTextEntry /><InputField name="newPassword" label="New password" required register={form.register} errors={form.formState.errors} secureTextEntry /><InputField name="confirmPassword" label="Confirm new password" required register={form.register} errors={form.formState.errors} secureTextEntry /><SelectField label="Other sessions" required error={form.formState.errors.revokeOtherSessions?.message} value={form.watch("revokeOtherSessions")} options={[{ label: "Revoke", value: "yes" }, { label: "Keep active", value: "no" }]} onChange={(value) => form.setValue("revokeOtherSessions", value as "yes" | "no", { shouldValidate: true })} /><SubmitButton label="Change password" loading={form.formState.isSubmitting} onPress={() => void form.handleSubmit(submit)()} /></View><Pressable onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>Sign out from this device</Text></Pressable></Screen></>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: spacing.md, padding: spacing.md }, copy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, signOut: { alignItems: "center", borderColor: "#F4B4B0", borderRadius: 10, borderWidth: 1, padding: 13 }, signOutText: { color: colors.danger, fontSize: 12, fontWeight: "900" } });
