import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { requestPasswordReset } from "../src/lib/api";
import { colors, spacing } from "../src/theme";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setMessage("Enter a valid email address."); return; }
    setLoading(true); setMessage(null);
    try { await requestPasswordReset(email.trim()); setMessage("If the account exists, a reset link has been sent."); }
    catch { setMessage("Unable to request a reset link. Try again shortly."); }
    finally { setLoading(false); }
  }

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}><View style={styles.card}><Text style={styles.title}>Reset password</Text><Text style={styles.copy}>We will send a secure reset link to your registered email.</Text><Text style={styles.label}>Email</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="name@example.id" placeholderTextColor={colors.textMuted} style={styles.input} value={email} />{message ? <Text style={styles.message}>{message}</Text> : null}<Pressable disabled={loading} onPress={() => void submit()} style={[styles.button, loading && styles.disabled]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send reset link</Text>}</Pressable><Link href="/login" style={styles.back}>Back to sign in</Link></View></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ page: { alignItems: "center", backgroundColor: colors.page, flex: 1, justifyContent: "center", padding: spacing.xl }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: spacing.sm, padding: spacing.xl, width: "100%" }, title: { color: colors.text, fontSize: 24, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.md }, label: { color: colors.text, fontSize: 12, fontWeight: "800" }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, height: 46, paddingHorizontal: 13 }, message: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, height: 46, justifyContent: "center", marginTop: spacing.md }, disabled: { opacity: 0.6 }, buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, back: { color: colors.primary, fontSize: 12, fontWeight: "800", marginTop: spacing.md, textAlign: "center" } });
