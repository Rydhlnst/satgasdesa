"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  return <div aria-live="polite" className={online ? "sr-only" : "fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100"}>{online ? <Wifi aria-hidden="true" /> : <><WifiOff aria-hidden="true" />Offline · Draf lokal belum tersinkron</>}</div>;
}
