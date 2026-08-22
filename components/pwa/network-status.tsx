"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { UI_MESSAGES } from "@/src/lib/ui/messages";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  return <div aria-live="assertive" className={online ? "sr-only" : "fixed inset-x-0 top-0 z-50 flex min-h-11 items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-800 ring-1 ring-amber-500/20 dark:bg-amber-950/80 dark:text-amber-100"} data-state-tone="warning" role="status">{online ? null : <><WifiOff aria-hidden="true" className="size-4 shrink-0" /><span>{UI_MESSAGES.states.offline.title} · Draf lokal tersimpan, belum dikirim</span></>}</div>;
}
