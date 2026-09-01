import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../src/auth";
import { DatePicker, FormGrid, FormGridItem, SelectField, SubmitButton, TextInputField } from "../../src/components/NativeForm";
import { ErrorState, Header, LoadingState, Screen } from "../../src/components/Screen";
import { Button, ButtonText } from "../../src/components/ui/button";
import { endAssignmentFormSchema, workerAssignmentFormSchema, workerFormSchema } from "../../src/form-schemas";
import { AppAlert as Alert, showActionError } from "../../src/lib/feedback";
import { assignWorkerToBlock, endWorkerBlockAssignment, getBlocks, getFieldWorker, updateFieldWorker } from "../../src/lib/api";
import { mergeFormErrors, zodFieldErrors } from "../../src/lib/form-validation";
import { text } from "../../src/lib/read";
import { colors, radii, spacing, typography } from "../../src/theme";

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role, session } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["field-worker", id], queryFn: () => getFieldWorker(id), enabled: Boolean(role && id) });
  const blocks = useQuery({ queryKey: ["blocks", "worker-assignment"], queryFn: () => getBlocks(), enabled: Boolean(role) });
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [blockId, setBlockId] = useState("");
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 10));

  if (!role) return null;
  if (query.isLoading) return <><Header role={role} title="Detail Pekerja" /><Screen><LoadingState /></Screen></>;
  if (query.isError || !query.data) return <><Header role={role} title="Detail Pekerja" /><Screen><ErrorState message="Data pekerja tidak dapat dimuat." error={query.error} onRetry={() => query.refetch()} /></Screen></>;

  const values = draft ?? workerValues(query.data.item);
  const canManage = session?.permissions.includes("WORKER_MANAGE") ?? false;
  const updateDraft = (key: string, value: string) => { setDraft((current) => ({ ...(current ?? values), [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); };
  async function refresh() { await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ["field-workers"] })]); }

  async function save() {
    if (saving) return;
    const parsed = workerFormSchema.safeParse(values);
    if (!parsed.success) { setErrors(zodFieldErrors(parsed.error)); return; }
    setErrors({});
    setSaving(true);
    try { await updateFieldWorker({ id, ...parsed.data }); await refresh(); setDraft(null); }
    catch (error) { setErrors((current) => mergeFormErrors(current, error)); showActionError(error, "Periksa koneksi lalu coba lagi."); }
    finally { setSaving(false); }
  }

  async function assign() {
    if (saving) return;
    const parsed = workerAssignmentFormSchema.safeParse({ workerId: id, blockId, startedAt });
    if (!parsed.success) { setErrors(zodFieldErrors(parsed.error)); return; }
    setSaving(true);
    try { await assignWorkerToBlock(parsed.data); setBlockId(""); await refresh(); }
    catch (error) { setErrors((current) => mergeFormErrors(current, error)); showActionError(error, "Coba lagi."); }
    finally { setSaving(false); }
  }

  async function end(assignmentId: string) {
    if (saving) return;
    const parsed = endAssignmentFormSchema.safeParse({ id: assignmentId, endedAt: new Date().toISOString().slice(0, 10) });
    if (!parsed.success) return Alert.alert("Tanggal penutupan tidak valid", parsed.error.issues[0]?.message ?? "Gunakan tanggal kalender yang valid.");
    setSaving(true);
    try { await endWorkerBlockAssignment(parsed.data); await refresh(); }
    catch (error) { showActionError(error, "Coba lagi."); }
    finally { setSaving(false); }
  }

  return <><Header role={role} title="Detail Pekerja" subtitle="Identitas dan riwayat penempatan" /><Screen>
    {canManage ? <><FormGrid>
      <FormGridItem fullWidth><TextInputField label="Nama lengkap" required error={errors.fullName} value={values.fullName} onChange={(value) => updateDraft("fullName", value)} placeholder="Contoh: Budi Santoso" /></FormGridItem>
      <FormGridItem><TextInputField label="Telepon" error={errors.phone} value={values.phone} onChange={(value) => updateDraft("phone", value)} keyboardType="phone-pad" /></FormGridItem>
      <FormGridItem><SelectField label="Status" error={errors.status} value={values.status} onChange={(value) => updateDraft("status", value)} options={[{ label: "Aktif", value: "ACTIVE" }, { label: "Nonaktif", value: "INACTIVE" }]} /></FormGridItem>
      <FormGridItem fullWidth><TextInputField label="Jabatan" error={errors.position} value={values.position} onChange={(value) => updateDraft("position", value)} placeholder="Contoh: Pengawas lapangan" /></FormGridItem>
    </FormGrid><SubmitButton label="Simpan Perubahan" loading={saving} onPress={() => void save()} /></> : <View style={styles.card}><Text style={styles.name}>{text(query.data.item, "fullName")}</Text><Text style={styles.copy}>{text(query.data.item, "position", "Pekerja lapangan")}</Text></View>}
    <View style={styles.card}><Text style={styles.title}>Riwayat Penempatan</Text>{query.data.assignments.map((assignment) => <View key={text(assignment, "id")} style={styles.assignment}><Text style={styles.copy}>Blok: {text(assignment, "blockId")}</Text><Text style={styles.copy}>{text(assignment, "startedAt")} — {text(assignment, "endedAt", "Aktif")}</Text>{canManage && !text(assignment, "endedAt") ? <Button accessibilityLabel="Akhiri penempatan" onPress={() => void end(text(assignment, "id"))} variant="outline" className="mt-2 min-h-11 self-start rounded-xl border-[#F4B4B0] bg-white px-3"><ButtonText className="text-xs font-extrabold text-[#C03935]">Akhiri Penempatan</ButtonText></Button> : null}</View>)}</View>
    {canManage ? <View style={styles.card}><Text style={styles.title}>Tempatkan ke Blok</Text><FormGrid><FormGridItem><SelectField label="Blok tujuan" error={errors.blockId} value={blockId} onChange={(value) => { setBlockId(value); setErrors((current) => ({ ...current, blockId: "" })); }} options={(blocks.data?.blocks ?? []).map((block) => ({ label: `${block.code} · ${block.name}`, value: block.id }))} /></FormGridItem><FormGridItem><DatePicker label="Tanggal mulai" value={startedAt} onChange={(value) => { setStartedAt(value); setErrors((current) => ({ ...current, startedAt: "" })); }} error={errors.startedAt} /></FormGridItem></FormGrid><SubmitButton label="Simpan Penempatan" loading={saving} onPress={() => void assign()} /></View> : null}
  </Screen></>;
}

function workerValues(item: Record<string, unknown>): Record<string, string> { return { fullName: text(item, "fullName"), phone: text(item, "phone"), position: text(item, "position"), status: text(item, "status", "ACTIVE") }; }

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, title: { color: colors.textStrong, fontSize: typography.body, fontWeight: "900" }, name: { color: colors.textStrong, fontSize: 19, fontWeight: "900" }, copy: { color: colors.textMuted, fontSize: typography.caption }, assignment: { borderTopColor: colors.border, borderTopWidth: 1, gap: 3, paddingTop: spacing.sm } });
