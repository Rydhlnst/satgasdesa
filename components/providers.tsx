"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppProvidersProps = { children: ReactNode };

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="satgas-theme">
        {children}
        <Toaster closeButton position="bottom-right" />
      </ThemeProvider>
    </TooltipProvider>
  );
}
