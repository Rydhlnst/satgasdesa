"use client";

import { useActionState } from "react";

import { FormErrorToast } from "@/components/shared/action-feedback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvitedUser, type UserCreateState } from "@/src/features/users/actions";

const initialState: UserCreateState = { error: null, success: null };

type CreateUserFormProps = {
  roles: Array<{ id: string; name: string }>;
};

export function CreateUserForm({ roles }: CreateUserFormProps) {
  const [state, formAction, isPending] = useActionState(createInvitedUser, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm" noValidate>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invite user</p>
        <p className="mt-1 text-sm text-muted-foreground">The user receives a secure password setup link by email.</p>
      </div>
      {state.error ? <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert> : null}
      <FormErrorToast error={state.error} />
      {state.success ? <Alert><AlertDescription>{state.success}</AlertDescription></Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="new-user-name">Name</Label><Input id="new-user-name" name="name" required maxLength={255} /></div>
        <div className="space-y-2"><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" name="email" type="email" required maxLength={255} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="new-user-role">Role</Label><select id="new-user-role" name="roleId" required defaultValue="" className="h-10 w-full border border-border bg-background px-3 text-sm"><option value="" disabled>Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
      <Button type="submit" disabled={isPending}>{isPending ? "Creating invitation…" : "Create and invite"}</Button>
    </form>
  );
}
