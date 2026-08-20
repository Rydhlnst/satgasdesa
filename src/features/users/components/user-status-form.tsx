"use client";

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

  return (
    <form
      action={updateUserStatus}
      onSubmit={(event) => {
        if (isDeactivation && !window.confirm(`Deactivate ${userName}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button type="submit" size="xs" variant="ghost">
        {isDeactivation ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}
