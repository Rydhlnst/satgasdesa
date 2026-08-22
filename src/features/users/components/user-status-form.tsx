"use client";

import { ActionForm, ConfirmActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { updateUserStatus } from "@/src/features/users/actions";

type UserStatusFormProps = {
  userId: string;
  userName: string;
  status: "ACTIVE" | "INACTIVE";
};

export function UserStatusForm({ userId, userName, status }: UserStatusFormProps) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const isDeactivation = nextStatus === "INACTIVE";

  const fields = <><input type="hidden" name="userId" value={userId} /><input type="hidden" name="status" value={nextStatus} /><Button type="submit" size="xs" variant="ghost">{isDeactivation ? "Nonaktifkan" : "Aktifkan"}</Button></>;

  return isDeactivation ? (
    <ConfirmActionForm action={updateUserStatus} confirmActionLabel="Nonaktifkan" confirmDescription={`Akun ${userName} tidak dapat mengakses aplikasi setelah dinonaktifkan.`} confirmTitle="Nonaktifkan akun ini?">{fields}</ConfirmActionForm>
  ) : (
    <ActionForm action={updateUserStatus}>{fields}</ActionForm>
  );
}
