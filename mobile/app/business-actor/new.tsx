import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { z } from "zod";

import { useAuth } from "../../src/auth";
import { InputField, SelectField, SubmitButton } from "../../src/components/NativeForm";
import { Header, Screen } from "../../src/components/Screen";
import { businessActorFormSchema as schema } from "../../src/form-schemas";
import { createBusinessActor } from "../../src/lib/api";

type Values = z.infer<typeof schema>;

export default function NewBusinessActor() {
  const { role } = useAuth(); const router = useRouter(); const [saving, setSaving] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onChange", defaultValues: { actorType: "COMPANY" } });
  if (!role) return null;
  async function submit(values: Values) { setSaving(true); try { await createBusinessActor(values); Alert.alert("Berhasil", "Pelaku usaha berhasil ditambahkan.", [{ text: "OK", onPress: () => router.back() }]); } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Periksa data."); } finally { setSaving(false); } }
  return <><Header role={role} title="Pelaku Usaha" subtitle="Identitas penanggung jawab unit" /><Screen><SelectField label="Jenis pelaku usaha" required value={form.watch("actorType")} options={[{ label: "Perorangan", value: "INDIVIDUAL" }, { label: "Perusahaan", value: "COMPANY" }]} onChange={(value) => form.setValue("actorType", value as Values["actorType"], { shouldValidate: true })} /><InputField name="name" label="Nama pelaku usaha" required register={form.register} errors={form.formState.errors} /><InputField name="representativeName" label="Nama penanggung jawab" register={form.register} errors={form.formState.errors} /><InputField name="contact" label="Kontak" keyboardType="phone-pad" register={form.register} errors={form.formState.errors} placeholder="08xx / email" /><InputField name="address" label="Alamat" multiline register={form.register} errors={form.formState.errors} /><InputField name="notes" label="Catatan" multiline register={form.register} errors={form.formState.errors} /><SubmitButton label="Simpan Pelaku Usaha" loading={saving} onPress={() => void form.handleSubmit(submit)()} /></Screen></>;
}
