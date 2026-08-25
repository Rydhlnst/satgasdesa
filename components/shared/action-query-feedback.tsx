"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ActionQueryFeedback() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("actionError");

  useEffect(() => {
    if (!error) return;
    toast.error(error, { id: `action-error:${error}` });
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("actionError");
    router.replace(nextParams.size ? `${pathname}?${nextParams}` : pathname, { scroll: false });
  }, [error, pathname, router, searchParams]);

  return null;
}
