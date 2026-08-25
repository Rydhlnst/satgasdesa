import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { Header, Screen } from "../../src/components/Screen";
import { updateBusinessActor } from "../../src/lib/api";

const schema = z.object({ actorType: z.enum(["INDIVIDUAL", "COMPANY"]), name: z.string().trim().min(1, "Nama wajib diisi.").max(160), representativeName: z.string().max(160).optional(), contact: z.string().max(64).optional(), address: z.string().max(5000).optional(), notes: z.string().max(5000).optional() });
type Values = z.infer<typeof schema>;

export default function EditBusinessActor() {
  const { role } = useAuth(); const router = useRouter(); const params = useLocalSearchParams<{ id: string; actorType?: string; name?: string; representativeName?: string; contact?: string; address?: string; notes?: string }>(); const [saving, setSaving] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { actorType: params.actorType === "INDIVIDUAL" ? "INDIVIDUAL" : "COMPANY", name: params.name ?? "", representativeName: params.representativeName ?? "", contact: params.contact ?? "", address: params.address ?? "", notes: params.notes ?? "" } });
  if (!role) return null;
  async function submit(values: Values) { if (!params.id) return; setSaving(true); try { await updateBusinessActor({ ...values, id: params.id }); Alert.alert("Berhasil", "Pelaku usaha berhasil diperbarui.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Edit Pelaku Usaha" subtitle="Perbarui master data" /><Screen><SelectField label="Jenis pelaku usaha" value={form.watch("actorType")} options={[{ label: "Perorangan", value: "INDIVIDUAL" }, { label: "Perusahaan", value: "COMPANY" }]} onChange={(value) => form.setValue("actorType", value as Values["actorType"], { shouldValidate: true })} /><InputField name="name" label="Nama pelaku usaha" register={form.register} errors={form.formState.errors} /><InputField name="representativeName" label="Nama penanggung jawab" register={form.register} errors={form.formState.errors} /><InputField name="contact" label="Kontak" keyboardType="numeric" register={form.register} errors={form.formState.errors} /><InputField name="address" label="Alamat" multiline register={form.register} errors={form.formState.errors} /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} /><SubmitButton label="Simpan Perubahan" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
