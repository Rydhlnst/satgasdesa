"use client";

import { useActionState } from "react";

import { FormErrorToast } from "@/components/shared/action-feedback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser, type UserCreateState } from "@/src/features/users/actions";

const initialState: UserCreateState = { error: null, success: null };

type CreateUserFormProps = {
  roles: Array<{ id: string; name: string }>;
};

export function CreateUserForm({ roles }: CreateUserFormProps) {
  const [state, formAction, isPending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm" noValidate>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Create account</p>
        <p className="mt-1 text-sm text-muted-foreground">Set the user&apos;s initial password. The account can sign in immediately.</p>
      </div>
      {state.error ? <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert> : null}
      <FormErrorToast error={state.error} />
      {state.success ? <Alert><AlertDescription>{state.success}</AlertDescription></Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="new-user-name">Name</Label><Input id="new-user-name" name="name" required maxLength={255} /></div>
        <div className="space-y-2"><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" name="email" type="email" required maxLength={255} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="new-user-role">Role</Label><select id="new-user-role" name="roleId" required defaultValue="" className="h-10 w-full border border-border bg-background px-3 text-sm"><option value="" disabled>Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="new-user-password">Password</Label><Input id="new-user-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /><p className="text-xs text-muted-foreground">Use at least 8 characters. The account is ready to use immediately.</p></div>
      <Button type="submit" disabled={isPending}>{isPending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}
