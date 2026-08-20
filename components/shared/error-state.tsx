import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ErrorStateProps = { title?: string; description: string; action?: ReactNode };

export function ErrorState({ title = "Terjadi kesalahan", description, action }: ErrorStateProps) {
  return <Alert className="border-destructive/30 bg-destructive/5" variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>{title}</AlertTitle><AlertDescription>{description}{action ? <span className="mt-4 block">{action}</span> : null}</AlertDescription></Alert>;
}
