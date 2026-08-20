"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { compressImage } from "@/src/lib/images/compress-image";
import { addRealizationEvidenceAction, createRealizationEvidenceUploadAction } from "@/app/dashboard/realizations/_actions";
import { addTransactionEvidenceAction, createTransactionEvidenceUploadAction } from "@/app/dashboard/finance/_actions";

type EvidenceUploaderProps = { kind: "transaction" | "realization"; entityId: string; disabled?: boolean };

export function EvidenceUploader({ kind, entityId, disabled }: EvidenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setPending(true); setMessage(null); setError(null);
    try {
      const prepared = file.type.startsWith("image/") ? (await compressImage(file)).file : file;
      const input = { originalName: prepared.name, contentType: prepared.type, sizeBytes: prepared.size };
      const uploadResult = kind === "transaction"
        ? await createTransactionEvidenceUploadAction({ transactionId: entityId, ...input })
        : await createRealizationEvidenceUploadAction({ realizationId: entityId, ...input });
      const response = await fetch(uploadResult.uploadUrl, { method: "PUT", headers: { "Content-Type": prepared.type }, body: prepared });
      if (!response.ok) throw new Error("The file could not be uploaded to object storage.");
      if (kind === "transaction") await addTransactionEvidenceAction({ transactionId: entityId, storageKey: uploadResult.key, contentType: prepared.type, sizeBytes: prepared.size });
      else await addRealizationEvidenceAction({ realizationId: entityId, storageKey: uploadResult.key, contentType: prepared.type, sizeBytes: prepared.size });
      setMessage("Evidence uploaded successfully.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Evidence upload failed.");
    } finally { setPending(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return <div className="space-y-3"><label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-border bg-muted/20 px-4 py-6 text-xs font-semibold uppercase tracking-wider hover:bg-muted"><FilePlus2 aria-hidden="true" />{pending ? "Uploading…" : "Add evidence"}<input ref={inputRef} accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={disabled || pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} type="file" /></label>{disabled ? <p className="text-xs text-muted-foreground">Evidence upload is locked for this record status.</p> : <p className="text-xs text-muted-foreground">Images are resized to a 1600px maximum edge before upload. Maximum file size is 10 MB.</p>}{message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<Button className="sr-only" type="button" onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" />Choose file</Button></div>;
}
