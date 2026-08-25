import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react-native";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { useAuth } from "../src/auth";
import { colors, spacing } from "../src/theme";

const schema = z.object({ email: z.string().email("Masukkan email yang valid."), password: z.string().min(1, "Masukkan kata sandi.") });
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { loading, session, signIn } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  if (!loading && session) return <Redirect href="/dashboard" />;
  async function submit(values: FormValues) { setServerError(null); try { await signIn(values.email, values.password); router.replace("/dashboard"); } catch (error) { setServerError(error instanceof Error ? error.message : "Tidak dapat masuk."); } }
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={styles.brand}><Text style={styles.brandTitle}>SATGAS DESA</Text><Text style={styles.brandSubtitle}>SEJOLI</Text></View><View style={styles.card}><Text style={styles.title}>Masuk</Text><Text style={styles.description}>Gunakan akun internal yang diberikan administrator.</Text><Text style={styles.label}>Email</Text><Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onBlur={onBlur} onChangeText={onChange} placeholder="nama@contoh.id" placeholderTextColor={colors.textMuted} style={styles.input} value={value} />} />{errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}<Text style={styles.label}>Kata sandi</Text><View style={styles.inputWrap}><Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <TextInput autoComplete="password" onBlur={onBlur} onChangeText={onChange} placeholder="Kata sandi" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} style={[styles.input, styles.inputWithAction]} value={value} />} /><Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} accessibilityRole="button" hitSlop={8} onPress={() => setShowPassword((current) => !current)} style={styles.inputAction}>{showPassword ? <EyeOff color={colors.textMuted} size={19} /> : <Eye color={colors.textMuted} size={19} />}</Pressable></View>{errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}{serverError ? <Text style={styles.error}>{serverError}</Text> : null}<Pressable disabled={isSubmitting} onPress={handleSubmit(submit)} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Masuk</Text>}</Pressable><Link href="/forgot-password" style={styles.forgot}>Lupa kata sandi?</Link></View></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.page, justifyContent: "center", padding: spacing.xl }, brand: { marginBottom: spacing.xl }, brandTitle: { color: colors.primaryDark, fontSize: 24, fontWeight: "800", letterSpacing: 2 }, brandSubtitle: { color: colors.primary, fontSize: 14, fontWeight: "700", letterSpacing: 4, marginTop: 2 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: spacing.xl }, title: { color: colors.text, fontSize: 25, fontWeight: "800" }, description: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.xl, marginTop: spacing.sm }, label: { color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 7, marginTop: spacing.md }, inputWrap: { position: "relative" }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 46, paddingHorizontal: 13 }, inputWithAction: { paddingRight: 48 }, inputAction: { alignItems: "center", height: 44, justifyContent: "center", position: "absolute", right: 2, top: 1, width: 44 }, error: { color: colors.danger, fontSize: 11, marginTop: 6 }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, height: 46, justifyContent: "center", marginTop: spacing.xl }, buttonText: { color: "#fff", fontSize: 13, fontWeight: "800" }, forgot: { color: colors.primary, fontSize: 12, fontWeight: "800", marginTop: spacing.md, textAlign: "center" } });
