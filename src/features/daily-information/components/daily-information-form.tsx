"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { createDailyInformationAction } from "@/app/dashboard/information/_actions";
import { FormErrorToast, showActionError } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { DAILY_INFORMATION_CATEGORIES, DAILY_INFORMATION_PRIORITIES } from "@/src/features/daily-information/constants";

type DailyInformationFormProps = { blocks: Array<{ id: string; code: string; name: string }> };

const dailyInformationFormSchema = z.object({
  blockId: z.string(),
  reportedAt: z.string().min(1, "Tanggal wajib diisi."),
  category: z.string().min(1, "Kategori wajib dipilih."),
  priority: z.string().min(1, "Prioritas wajib dipilih."),
  description: z.string().trim().min(1, "Deskripsi wajib diisi.").max(10000),
  documentation: z.string().max(10000),
});

function FieldError({ errors }: { errors: unknown[] }) {
  const message = errors[0];
  return message ? <p className="text-xs text-destructive">{String(message)}</p> : null;
}

export function DailyInformationForm({ blocks }: DailyInformationFormProps) {
  const form = useForm({
    defaultValues: { blockId: "", reportedAt: new Date().toISOString().slice(0, 10), category: "", priority: "MEDIUM", description: "", documentation: "" },
    validators: { onSubmit: ({ value }) => { const result = dailyInformationFormSchema.safeParse(value); return result.success ? undefined : result.error.issues[0]?.message ?? "Periksa kembali formulir."; } },
    onSubmit: async ({ value }) => {
      const formData = new FormData();
      Object.entries(value).forEach(([key, item]) => formData.set(key, item));
      try { await createDailyInformationAction(formData); } catch (error) { showActionError(error); throw error; }
    },
  });

  return <Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl">Informasi lapangan baru</CardTitle><p className="text-sm text-muted-foreground">Catat keluhan, insiden, pemberitahuan, atau calon pengelola secara terstruktur.</p></CardHeader><CardContent><form className="space-y-6" noValidate onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
    <form.Subscribe selector={(state) => state.errors}>{(errors) => <>{errors.length ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{String(errors[0])}</p> : null}<FormErrorToast error={errors[0]} /></>}</form.Subscribe>
    <div className="grid gap-5 sm:grid-cols-2">
      <form.Field name="category">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Kategori</Label><NativeSelect aria-invalid={field.state.meta.errors.length > 0} id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)}><NativeSelectOption disabled value="">Pilih kategori</NativeSelectOption>{DAILY_INFORMATION_CATEGORIES.map((item) => <NativeSelectOption key={item} value={item}>{item.replaceAll("_", " ")}</NativeSelectOption>)}</NativeSelect><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
      <form.Field name="priority">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Prioritas</Label><NativeSelect id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)}>{DAILY_INFORMATION_PRIORITIES.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
      <form.Field name="blockId">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Blok terkait</Label><NativeSelect id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)}><NativeSelectOption value="">Tidak terkait blok</NativeSelectOption>{blocks.map((block) => <NativeSelectOption key={block.id} value={block.id}>{block.code} · {block.name}</NativeSelectOption>)}</NativeSelect></div>}</form.Field>
      <form.Field name="reportedAt">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Tanggal laporan</Label><Input aria-invalid={field.state.meta.errors.length > 0} id={field.name} name={field.name} type="date" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
    </div>
    <form.Field name="description">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Deskripsi</Label><Textarea aria-invalid={field.state.meta.errors.length > 0} id={field.name} name={field.name} maxLength={10000} placeholder="Jelaskan informasi lapangan secara singkat dan jelas." value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
    <form.Field name="documentation">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Dokumentasi</Label><Textarea id={field.name} name={field.name} maxLength={10000} placeholder="Tambahkan konteks, referensi, atau dokumentasi awal." value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /></div>}</form.Field>
    <form.Subscribe selector={(state) => state.isSubmitting}>{(isSubmitting) => <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Menyimpan…" : "Simpan informasi"}</Button>}</form.Subscribe>
  </form></CardContent></Card>;
}
