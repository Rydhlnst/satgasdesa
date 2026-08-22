"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/src/lib/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    toast.success("Anda telah keluar.");
    router.push("/login");
  }

  return (
    <Button disabled={isPending} onClick={handleSignOut} variant="outline">
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
