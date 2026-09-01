import { useRouter } from "expo-router";
import { useState } from "react";

import { useAuth } from "../../src/auth";
import { FormGrid, FormGridItem, SelectField, SubmitButton, TextInputField } from "../../src/components/NativeForm";
import { Header, Screen } from "../../src/components/Screen";
import { workerFormSchema } from "../../src/form-schemas";
import { AppAlert as Alert, showActionError } from "../../src/lib/feedback";
import { createFieldWorker } from "../../src/lib/api";
import { mergeFormErrors, zodFieldErrors } from "../../src/lib/form-validation";

export default function NewWorkerScreen() {
  const { role } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (key: string, setValue: (value: string) => void) => (value: string) => { setValue(value); setErrors((current) => ({ ...current, [key]: "" })); };

  if (!role) return null;

  async function save() {
    const parsed = workerFormSchema.safeParse({ fullName, phone, position, notes, status });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await createFieldWorker(parsed.data);
      Alert.alert("Pekerja ditambahkan", "Data pekerja berhasil disimpan.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      setErrors((current) => mergeFormErrors(current, error));
      showActionError(error, "Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return <><Header role={role} title="Pekerja Baru" subtitle="Data induk pekerja lapangan" /><Screen>
    <FormGrid>
      <FormGridItem fullWidth><TextInputField label="Nama lengkap" required error={errors.fullName} value={fullName} onChange={update("fullName", setFullName)} placeholder="Contoh: Budi Santoso" /></FormGridItem>
      <FormGridItem><TextInputField label="Nomor telepon" error={errors.phone} value={phone} onChange={update("phone", setPhone)} keyboardType="phone-pad" /></FormGridItem>
      <FormGridItem><SelectField label="Status" required error={errors.status} value={status} onChange={update("status", setStatus)} options={[{ label: "Aktif", value: "ACTIVE" }, { label: "Nonaktif", value: "INACTIVE" }]} /></FormGridItem>
      <FormGridItem fullWidth><TextInputField label="Jabatan" error={errors.position} value={position} onChange={update("position", setPosition)} placeholder="Contoh: Pengawas lapangan" /></FormGridItem>
      <FormGridItem fullWidth><TextInputField label="Catatan" error={errors.notes} value={notes} onChange={update("notes", setNotes)} multiline /></FormGridItem>
    </FormGrid>
    <SubmitButton label="Simpan Pekerja" loading={saving} onPress={() => void save()} />
  </Screen></>;
}
