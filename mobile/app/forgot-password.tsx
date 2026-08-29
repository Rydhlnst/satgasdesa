import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TextInput } from "../src/components/ui/TextInput";

import { forgotPasswordSchema } from "../src/form-schemas";
import { requestPasswordReset } from "../src/lib/api";
import { showActionError } from "../src/lib/feedback";
import { colors, spacing } from "../src/theme";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const normalizedEmail = email.trim();
    const parsed = forgotPasswordSchema.safeParse({ email: normalizedEmail });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Masukkan email yang valid, misalnya nama@contoh.id."); return; }
    setLoading(true); setMessage(null);
    try { await requestPasswordReset(normalizedEmail); setMessage("Jika akun tersedia, tautan reset sudah dikirim."); }
    catch (error) { const message = "Tautan reset tidak dapat diminta. Periksa koneksi lalu coba lagi."; setMessage(message); showActionError(error, message); }
    finally { setLoading(false); }
  }

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0} style={styles.page}><ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={styles.card}><Text style={styles.title}>Atur ulang kata sandi</Text><Text style={styles.copy}>Kami akan mengirim tautan pengaturan ulang yang aman ke email terdaftar Anda.</Text><Text style={styles.label}>Email</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="nama@contoh.id" placeholderTextColor={colors.textMuted} style={styles.input} value={email} />{message ? <Text style={styles.message}>{message}</Text> : null}<Pressable disabled={loading} onPress={() => void submit()} style={[styles.button, loading && styles.disabled]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Kirim tautan pengaturan ulang</Text>}</Pressable><Link href="/login" style={styles.back}>Kembali ke halaman masuk</Link></View></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ page: { alignItems: "center", backgroundColor: colors.page, flex: 1 }, scrollContent: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, width: "100%" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: spacing.sm, padding: spacing.xl, width: "100%" }, title: { color: colors.text, fontSize: 24, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.md }, label: { color: colors.text, fontSize: 12, fontWeight: "800" }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 46, paddingHorizontal: 13 }, message: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, height: 46, justifyContent: "center", marginTop: spacing.md }, disabled: { opacity: 0.6 }, buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, back: { color: colors.primary, fontSize: 12, fontWeight: "800", marginTop: spacing.md, textAlign: "center" } });
