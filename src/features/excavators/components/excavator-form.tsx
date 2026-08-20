"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { registerExcavatorAction } from "@/app/dashboard/excavators/_actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type ExcavatorFormProps = { blocks: Array<{ id: string; code: string; name: string }> };

const excavatorFormSchema = z.object({
  unitCode: z.string().trim().min(1, "Kode unit wajib diisi."),
  operatorName: z.string(),
  brand: z.string().trim().min(1, "Merek wajib diisi."),
  model: z.string().trim().min(1, "Model wajib diisi."),
  currentBlockId: z.string(),
  entryDate: z.string(),
  notes: z.string(),
});

function FieldError({ errors }: { errors: unknown[] }) { return errors[0] ? <p className="text-xs text-destructive">{String(errors[0])}</p> : null; }

export function ExcavatorForm({ blocks }: ExcavatorFormProps) {
  const form = useForm({
    defaultValues: { unitCode: "", operatorName: "", brand: "", model: "", currentBlockId: "", entryDate: "", notes: "" },
    validators: { onSubmit: ({ value }) => { const result = excavatorFormSchema.safeParse(value); return result.success ? undefined : result.error.issues[0]?.message ?? "Periksa kembali formulir."; } },
    onSubmit: async ({ value }) => { const formData = new FormData(); Object.entries(value).forEach(([key, item]) => formData.set(key, item)); await registerExcavatorAction(formData); },
  });

  return <Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl">Daftarkan excavator</CardTitle><p className="text-sm text-muted-foreground">Buat data unit terlebih dahulu. Riwayat perpindahan dicatat terpisah.</p></CardHeader><CardContent><form className="space-y-6" noValidate onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
    <form.Subscribe selector={(state) => state.errors}>{(errors) => errors.length ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{String(errors[0])}</p> : null}</form.Subscribe>
    <div className="grid gap-5 sm:grid-cols-2">
      <form.Field name="unitCode">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Kode unit</Label><Input aria-invalid={field.state.meta.errors.length > 0} id={field.name} name={field.name} placeholder="EXC-001" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
      <form.Field name="operatorName">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Nama operator</Label><Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /></div>}</form.Field>
      <form.Field name="brand">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Merek</Label><Input aria-invalid={field.state.meta.errors.length > 0} id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
      <form.Field name="model">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Model</Label><Input aria-invalid={field.state.meta.errors.length > 0} id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /><FieldError errors={field.state.meta.errors} /></div>}</form.Field>
      <form.Field name="currentBlockId">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Blok awal</Label><NativeSelect id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)}><NativeSelectOption value="">Belum ditugaskan</NativeSelectOption>{blocks.map((block) => <NativeSelectOption key={block.id} value={block.id}>{block.code} · {block.name}</NativeSelectOption>)}</NativeSelect><p className="text-xs text-muted-foreground">Penugasan blok memerlukan tanggal masuk.</p></div>}</form.Field>
      <form.Field name="entryDate">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Tanggal masuk</Label><Input id={field.name} name={field.name} type="date" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /></div>}</form.Field>
    </div>
    <form.Field name="notes">{(field) => <div className="space-y-2"><Label htmlFor={field.name}>Catatan pendaftaran</Label><Textarea id={field.name} name={field.name} maxLength={5000} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /></div>}</form.Field>
    <form.Subscribe selector={(state) => state.isSubmitting}>{(isSubmitting) => <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Menyimpan…" : "Daftarkan excavator"}</Button>}</form.Subscribe>
  </form></CardContent></Card>;
}
