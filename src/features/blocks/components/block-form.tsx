"use client";

import { useState, type ChangeEvent, type ComponentProps } from "react";
import { useForm } from "@tanstack/react-form";
import { LocateFixed, MapPin } from "lucide-react";

import { showActionError } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { BLOCK_PRIORITIES, BLOCK_STATUSES, blockFormSchema } from "../schema";
import type { FormServerAction } from "@/components/shared/action-form";

type BlockFormProps = {
  action: FormServerAction;
  submitLabel: string;
  initial?: Partial<Record<string, string | number | null>>;
};

const fields = [
  ["managerName", "Manager / operator"],
  ["locationPicName", "Location PIC"],
  ["fieldPicName", "Field PIC"],
  ["contact", "Contact"],
  ["locationPhotoKey", "Location photo key"],
] as const;

function valueOf(initial: BlockFormProps["initial"], key: string): string | number {
  const value = initial?.[key];
  return value === null || value === undefined ? "" : value;
}

export function BlockForm({ action, submitLabel, initial = {} }: BlockFormProps) {
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const form = useForm({
    defaultValues: {
      code: String(valueOf(initial, "code")),
      name: String(valueOf(initial, "name")),
      status: String(initial.status ?? "NOT_OPERATING"),
      priority: String(initial.priority ?? "NORMAL"),
      latitude: String(valueOf(initial, "latitude")),
      longitude: String(valueOf(initial, "longitude")),
      areaHectares: String(valueOf(initial, "areaHectares")),
      workerCount: String(valueOf(initial, "workerCount") || "0"),
      operationalCondition: String(initial.operationalCondition ?? ""),
      startDate: String(valueOf(initial, "startDate")),
      managerName: String(valueOf(initial, "managerName")),
      locationPicName: String(valueOf(initial, "locationPicName")),
      fieldPicName: String(valueOf(initial, "fieldPicName")),
      contact: String(valueOf(initial, "contact")),
      locationPhotoKey: String(valueOf(initial, "locationPhotoKey")),
      notes: String(valueOf(initial, "notes")),
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = blockFormSchema.safeParse(value);
        return result.success ? undefined : result.error.issues[0]?.message ?? "Please check the highlighted fields.";
      },
    },
    onSubmit: async ({ value }) => {
      const formData = new FormData();
      Object.entries(value).forEach(([key, item]) => formData.set(key, item));
      if (initial.id) formData.set("id", String(initial.id));
      try {
        await action(formData);
      } catch (error) {
        showActionError(error);
      }
    },
  });

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationState("error");
      setLocationMessage("This browser does not support location. Enter the coordinates manually.");
      return;
    }
    setLocationState("loading");
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setFieldValue("latitude", position.coords.latitude.toFixed(7));
        form.setFieldValue("longitude", position.coords.longitude.toFixed(7));
        setLocationState("idle");
        setLocationMessage(`Location captured${position.coords.accuracy ? ` · accuracy ±${Math.round(position.coords.accuracy)} m` : ""}.`);
      },
      (error) => {
        setLocationState("error");
        setLocationMessage(error.code === error.PERMISSION_DENIED ? "Location permission was denied. Allow it or enter coordinates manually." : "Location could not be captured. Enter the coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <form className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm" noValidate onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
      {initial.id ? <input type="hidden" name="id" value={String(initial.id)} /> : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Block record</p>
        <h2 className="mt-2 font-heading text-xl font-semibold uppercase tracking-wide">
          {initial.id ? "Edit block" : "Add block"}
        </h2>
      </div>

      <section className="space-y-4">
        <SectionTitle title="Identity" description="Code and name identify this block in every report." />
        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="code" validators={fieldValidators("code")}>
            {(field) => <Field label="Code" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} required placeholder="Example: BLK-001" />}
          </form.Field>
          <form.Field name="name" validators={fieldValidators("name")}>
            {(field) => <Field label="Name" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} required placeholder="Example: Blok Utara" />}
          </form.Field>
          <form.Field name="status" validators={fieldValidators("status")}>
            {(field) => <SelectField label="Status" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} options={BLOCK_STATUSES.map((status) => ({ label: status.replaceAll("_", " "), value: status }))} />}
          </form.Field>
          <form.Field name="priority" validators={fieldValidators("priority")}>
            {(field) => <SelectField label="Priority" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} options={BLOCK_PRIORITIES.map((priority) => ({ label: priority, value: priority }))} />}
          </form.Field>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title="Location" description="Use the device location or enter latitude and longitude manually." />
        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="latitude" validators={fieldValidators("latitude")}>
            {(field) => <Field label="Latitude" name={field.name} type="number" step="any" min={-90} max={90} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} required placeholder="-6.2000000" />}
          </form.Field>
          <form.Field name="longitude" validators={fieldValidators("longitude")}>
            {(field) => <Field label="Longitude" name={field.name} type="number" step="any" min={-180} max={180} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} required placeholder="106.8166667" />}
          </form.Field>
          <form.Field name="areaHectares" validators={fieldValidators("areaHectares")}>
            {(field) => <Field label="Area (hectares)" name={field.name} type="number" step="any" min={0} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} placeholder="Optional" />}
          </form.Field>
          <form.Field name="startDate" validators={fieldValidators("startDate")}>
            {(field) => <Field label="Start date" name={field.name} type="date" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} />}
          </form.Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Button disabled={locationState === "loading"} onClick={captureLocation} type="button" variant="outline"><LocateFixed aria-hidden="true" />{locationState === "loading" ? "Getting location…" : "Use my location"}</Button>
          {locationState === "idle" && locationMessage ? <p className="text-xs text-muted-foreground"><MapPin aria-hidden="true" className="mr-1 inline size-3" />{locationMessage}</p> : null}
          {locationState === "error" ? <p className="text-xs text-destructive">{locationMessage}</p> : null}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title="Operations" description="Worker count defaults to 0. Describe the current condition in plain language." />
        <form.Field name="workerCount" validators={fieldValidators("workerCount")}>
          {(field) => <Field label="Worker count" name={field.name} type="number" min={0} step={1} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} required />}
        </form.Field>
        <form.Field name="operationalCondition" validators={fieldValidators("operationalCondition")}>
          {(field) => <Field label="Operational condition" name={field.name} multiline value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} required placeholder="Example: Operating normally; access road is clear." />}
        </form.Field>
      </section>

      <section className="space-y-4">
        <SectionTitle title="People and notes" description="Optional fields can be left blank and completed later." />
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([name, label]) => (
            <form.Field key={name} name={name} validators={fieldValidators(name)}>
              {(field) => <Field label={label} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} placeholder="Optional" />}
            </form.Field>
          ))}
        </div>
        <form.Field name="notes" validators={fieldValidators("notes")}>
          {(field) => <Field label="Notes" name={field.name} multiline value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} error={field.state.meta.errors[0]} placeholder="Optional notes" />}
        </form.Field>
      </section>

      <form.Subscribe selector={(state) => state.errors}>{(errors) => errors.length ? <p aria-live="polite" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{String(errors[0])}</p> : null}</form.Subscribe>
      <form.Subscribe selector={(state) => state.isSubmitting}>{(isSubmitting) => <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Saving…" : submitLabel}</Button>}</form.Subscribe>
    </form>
  );
}

function fieldValidators(name: keyof typeof blockFormSchema.shape) {
  return {
    onBlur: ({ value }: { value: unknown }) => validateField(name, value),
    onSubmit: ({ value }: { value: unknown }) => validateField(name, value),
  };
}

function validateField(name: keyof typeof blockFormSchema.shape, value: unknown) {
  const result = blockFormSchema.shape[name].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message ?? "Please check this field.";
}

type FieldProps = {
  label: string;
  name: string;
  error?: unknown;
  multiline?: boolean;
  value: string;
  onBlur: () => void;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: ComponentProps<typeof Input>["type"];
  step?: ComponentProps<typeof Input>["step"];
  min?: ComponentProps<typeof Input>["min"];
  max?: ComponentProps<typeof Input>["max"];
};

function Field({ label, name, error, multiline, value, onBlur, onChange, placeholder, required, type, step, min, max }: FieldProps) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}{required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}</Label>{multiline ? <Textarea id={name} name={name} aria-invalid={Boolean(error)} maxLength={5000} onBlur={onBlur} onChange={onChange} placeholder={placeholder} required={required} rows={3} value={value} /> : <Input id={name} name={name} aria-invalid={Boolean(error)} max={max} min={min} onBlur={onBlur} onChange={onChange} placeholder={placeholder} required={required} step={step} type={type} value={value} />}{error ? <p className="text-xs text-destructive">{String(error)}</p> : null}</div>;
}

function SelectField({ label, name, value, error, options, onChange, onBlur }: { label: string; name: string; value: string; error?: unknown; options: Array<{ label: string; value: string }>; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; onBlur: () => void }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><select aria-invalid={Boolean(error)} className="h-10 w-full border-b border-input bg-transparent px-0 text-sm outline-none focus-visible:border-ring" id={name} name={name} onBlur={onBlur} onChange={onChange} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error ? <p className="text-xs text-destructive">{String(error)}</p> : null}</div>;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>;
}
