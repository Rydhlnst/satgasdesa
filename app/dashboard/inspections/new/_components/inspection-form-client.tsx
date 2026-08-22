"use client";

import { useEffect, useState } from "react";

import { InspectionForm } from "@/src/features/inspections/components/inspection-form";

type InspectionFormClientProps = {
  blocks: Array<{ id: string; code: string; name: string }>;
};

export function InspectionFormClient({ blocks }: InspectionFormClientProps) {
  const [mounted, setMounted] = useState(false);

  // This form depends on browser APIs; keep the server and first client render identical.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[520px] animate-pulse rounded-xl border border-border bg-card" />;

  return <InspectionForm blocks={blocks} />;
}
