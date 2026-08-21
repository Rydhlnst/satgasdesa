import type { ComponentProps } from "react";

import { ActionForm, type FormServerAction } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { BLOCK_STATUSES } from "../schema";

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
  return (
    <ActionForm action={action} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      {initial.id ? <input type="hidden" name="id" value={String(initial.id)} /> : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Block record</p>
        <h2 className="mt-2 font-heading text-xl font-semibold uppercase tracking-wide">
          {initial.id ? "Edit block" : "Add block"}
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Code" name="code" defaultValue={valueOf(initial, "code")} required />
        <Field label="Name" name="name" defaultValue={valueOf(initial, "name")} required />
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={String(initial.status ?? "NOT_OPERATING")}
            className="h-10 w-full border-b border-input bg-transparent px-0 text-sm outline-none focus-visible:border-ring"
          >
            {BLOCK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <Field label="Worker count" name="workerCount" type="number" min={0} defaultValue={valueOf(initial, "workerCount")} required />
        <Field label="Latitude" name="latitude" type="number" step="any" defaultValue={valueOf(initial, "latitude")} required />
        <Field label="Longitude" name="longitude" type="number" step="any" defaultValue={valueOf(initial, "longitude")} required />
        <Field label="Start date" name="startDate" type="date" defaultValue={valueOf(initial, "startDate")} />
        {fields.map(([name, label]) => (
          <Field key={name} label={label} name={name} defaultValue={valueOf(initial, name)} />
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="operationalCondition">Operational condition</Label>
        <textarea
          id="operationalCondition"
          name="operationalCondition"
          defaultValue={String(initial.operationalCondition ?? "")}
          required
          rows={3}
          className="w-full border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={String(initial.notes ?? "")}
          rows={3}
          className="w-full border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </ActionForm>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
