"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, LocateFixed, MapPin, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createInspectionAction, createInspectionUploadAction } from "@/app/dashboard/inspections/_actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/src/lib/images/compress-image";
import { deleteInspectionDraft, loadInspectionDraft, saveInspectionDraft, updateInspectionDraftStatus, type InspectionDraftPayload } from "@/src/features/inspections/draft";
import { deleteInspectionPhotoDrafts, loadInspectionPhotoDrafts, saveInspectionPhotoDrafts } from "@/src/features/inspections/photo-draft";

/* Local blob previews cannot use next/image. */
/* eslint-disable @next/next/no-img-element */

type InspectionFormProps = { blocks: Array<{ id: string; code: string; name: string }> };
type LocalPhoto = { file: File; preview: string; originalName: string; originalSize: number };
type FormFields = Omit<InspectionDraftPayload, "gps">;

const DRAFT_ID = "new-inspection";
const EMPTY_FIELDS: FormFields = { blockId: "", inspectedAt: "", excavatorCount: "0", workerCount: "0", condition: "", findings: "", notes: "" };
const STEPS = ["Lokasi", "Observasi", "Foto & kirim"];

function photoRecords(photos: LocalPhoto[]) {
  return photos.map((photo, index) => ({ id: `${DRAFT_ID}-${index}`, draftId: DRAFT_ID, originalName: photo.originalName, originalSize: photo.originalSize, optimizedSize: photo.file.size, contentType: photo.file.type, blob: photo.file }));
}

export function InspectionForm({ blocks }: InspectionFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const photosRef = useRef<LocalPhoto[]>([]);
  const [gps, setGps] = useState<InspectionDraftPayload["gps"]>(null);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftState, setDraftState] = useState<"none" | "saved" | "loaded">("none");
  const [syncState, setSyncState] = useState<"local" | "unsynced" | "submitting" | "failed">("local");
  const isOnline = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
  const [step, setStep] = useState(0);

  function reportError(message: string) {
    setError(message);
    toast.error(message);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const draft = loadInspectionDraft(DRAFT_ID);
      if (draft) {
        const { gps: draftGps, ...draftFields } = draft.payload;
        setFields({ ...EMPTY_FIELDS, ...draftFields });
        setGps(draftGps ?? null);
        setDraftState("loaded");
        setSyncState(draft.status === "unsynced" || draft.status === "failed" ? draft.status : "local");
      } else setFields((current) => ({ ...current, inspectedAt: new Date().toISOString().slice(0, 16) }));
      void loadInspectionPhotoDrafts(DRAFT_ID).then((storedPhotos) => {
        const restoredPhotos = storedPhotos.map((photo) => { const file = new File([photo.blob], photo.originalName, { type: photo.contentType }); return { file, preview: URL.createObjectURL(file), originalName: photo.originalName, originalSize: photo.originalSize }; });
        if (restoredPhotos.length) setPhotos(restoredPhotos);
      }).catch(() => reportError("Foto draf lokal tidak dapat dipulihkan."));
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);
  useEffect(() => {
    if (!draftReady || isPending) return;
    const timeout = window.setTimeout(() => { const saved = saveInspectionDraft(DRAFT_ID, { ...fields, gps }, syncState === "unsynced" || syncState === "failed" ? syncState : "local"); if (saved) setDraftState("saved"); }, 500);
    return () => window.clearTimeout(timeout);
  }, [draftReady, fields, gps, isPending, syncState]);

  function updateField(name: keyof FormFields, value: string) { setFields((current) => ({ ...current, [name]: value })); setDraftReady(true); }
  function saveDraftNow() { const saved = saveInspectionDraft(DRAFT_ID, { ...fields, gps }, syncState === "unsynced" || syncState === "failed" ? syncState : "local"); setDraftState(saved ? "saved" : "none"); void saveInspectionPhotoDrafts(DRAFT_ID, photoRecords(photos)); toast.success(saved ? "Draf inspeksi disimpan di perangkat ini." : "Draf inspeksi belum dapat disimpan."); }
  function discardDraft() { deleteInspectionDraft(DRAFT_ID); void deleteInspectionPhotoDrafts(DRAFT_ID); setDraftReady(false); setFields(EMPTY_FIELDS); setGps(null); setPhotos([]); setDraftState("none"); setSyncState("local"); setError(null); toast.success("Draf inspeksi dihapus."); }

  function captureLocation() {
    if (!navigator.geolocation) { setGpsState("error"); reportError("Peramban ini tidak mendukung lokasi."); return; }
    setGpsState("loading"); setError(null);
    navigator.geolocation.getCurrentPosition((position) => { setGps({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date().toISOString() }); setGpsState("idle"); setDraftReady(true); toast.success("Lokasi berhasil diambil."); }, (positionError) => { setGpsState("error"); reportError(positionError.code === positionError.PERMISSION_DENIED ? "Izin lokasi ditolak. Aktifkan izin lokasi lalu coba lagi." : "Lokasi belum dapat diambil. Coba lagi di area terbuka." ); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []); const next = [...photos]; setError(null); setIsOptimizing(true);
    for (const file of selected) {
      if (next.length >= 3) break;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { reportError("Foto harus berformat JPG, PNG, atau WEBP."); continue; }
      if (file.size > 10 * 1024 * 1024) { reportError("Ukuran setiap foto maksimal 10 MB."); continue; }
      try { const optimized = await compressImage(file); next.push({ file: optimized.file, preview: URL.createObjectURL(optimized.file), originalName: file.name, originalSize: optimized.originalSize }); } catch (compressionError) { reportError(compressionError instanceof Error ? compressionError.message : "Foto tidak dapat dioptimalkan."); }
    }
    setPhotos(next); setIsOptimizing(false); event.target.value = ""; void saveInspectionPhotoDrafts(DRAFT_ID, photoRecords(next)); if (next.length > photos.length) toast.success(`${next.length - photos.length} foto siap dikirim.`);
  }

  function removePhoto(index: number) { setPhotos((current) => { const removed = current[index]; if (removed) URL.revokeObjectURL(removed.preview); const next = current.filter((_, photoIndex) => photoIndex !== index); void saveInspectionPhotoDrafts(DRAFT_ID, photoRecords(next)); return next; }); }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); setError(null);
    if (!fields.blockId) { setStep(0); reportError("Pilih blok sebelum mengirim inspeksi."); return; }
    if (!gps) { setStep(0); reportError("Ambil lokasi sebelum mengirim inspeksi."); return; }
    if (!navigator.onLine) {
      saveInspectionDraft(DRAFT_ID, { ...fields, gps }, "unsynced");
      void saveInspectionPhotoDrafts(DRAFT_ID, photoRecords(photos));
      setSyncState("unsynced");
      setDraftState("saved");
      reportError("Perangkat sedang offline. Inspeksi disimpan sebagai draf belum tersinkron dan dapat dikirim ulang saat koneksi kembali.");
      return;
    }
    const inspectionId = crypto.randomUUID(); setIsPending(true); setSyncState("submitting"); updateInspectionDraftStatus(DRAFT_ID, "submitting");
    try {
      const uploadedPhotos = [];
      for (const [index, photo] of photos.entries()) { setProgress(`Mengunggah foto ${index + 1} dari ${photos.length}…`); const upload = await createInspectionUploadAction({ inspectionId, contentType: photo.file.type, size: photo.file.size, originalName: photo.file.name }); const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": photo.file.type }, body: photo.file }); if (!response.ok) throw new Error("Foto tidak dapat diunggah."); uploadedPhotos.push({ storageKey: upload.key, contentType: photo.file.type, size: photo.file.size, originalName: photo.file.name, capturedAt: new Date() }); }
      setProgress("Menyimpan inspeksi…"); const result = await createInspectionAction({ id: inspectionId, blockId: fields.blockId, inspectedAt: fields.inspectedAt ? new Date(fields.inspectedAt) : undefined, latitude: gps.latitude, longitude: gps.longitude, gpsAccuracy: gps.accuracy, gpsCapturedAt: new Date(gps.capturedAt), excavatorCount: Number(fields.excavatorCount), workerCount: Number(fields.workerCount), condition: fields.condition, findings: fields.findings.trim() || undefined, notes: fields.notes.trim() || undefined, photos: uploadedPhotos });
      deleteInspectionDraft(DRAFT_ID); await deleteInspectionPhotoDrafts(DRAFT_ID); setSyncState("local"); toast.success("Inspeksi berhasil dikirim."); router.push(`/dashboard/inspections/${result.id}`);
    } catch (submissionError) { saveInspectionDraft(DRAFT_ID, { ...fields, gps }, "failed"); void saveInspectionPhotoDrafts(DRAFT_ID, photoRecords(photos)); setSyncState("failed"); setDraftState("saved"); reportError(submissionError instanceof Error ? submissionError.message : "Inspeksi tidak dapat disimpan. Coba lagi."); } finally { setIsPending(false); setProgress(null); }
  }

  const statusLabel = syncState === "unsynced" ? "BELUM TERSINKRON" : syncState === "submitting" ? "MENGIRIM" : syncState === "failed" ? "PENGIRIMAN GAGAL" : draftState === "loaded" ? "DRAF LOKAL DIPULIHKAN" : draftState === "saved" ? "DRAF LOKAL" : "BELUM DIKIRIM";
  const statusSemantic = syncState === "failed" ? "danger" : syncState === "unsynced" ? "warning" : syncState === "submitting" ? "info" : "neutral";
  return <Card className="shadow-sm"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="font-heading text-xl">Inspeksi lapangan</CardTitle><p className="mt-2 text-sm text-muted-foreground">Draf tersimpan di perangkat ini sampai inspeksi dikirim.</p></div><StatusBadge label={statusLabel} semantic={statusSemantic} status="LOCAL_DRAFT" /></div>{!isOnline ? <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800">Offline · data baru tersimpan lokal dan belum tersinkron.</p> : null}<div className="grid grid-cols-3 gap-2 pt-4">{STEPS.map((item, index) => <button className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${step === index ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`} disabled={isPending} key={item} onClick={() => setStep(index)} type="button"><span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px]">{index + 1}</span>{item}</button>)}</div></CardHeader><CardContent><form className="space-y-7" onSubmit={(event) => void handleSubmit(event)}>
    {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <section className={step === 0 ? "space-y-4" : "hidden"}><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lokasi dan waktu</p><p className="mt-1 text-sm text-muted-foreground">Ambil GPS dari perangkat lapangan sebelum mengirim.</p></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="blockId">Blok</Label><select className="h-10 w-full border border-input bg-background px-3 text-sm" value={fields.blockId} onChange={(event) => updateField("blockId", event.target.value)} id="blockId" name="blockId" required><option disabled value="">Pilih blok</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.code} · {block.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="inspectedAt">Waktu inspeksi</Label><Input value={fields.inspectedAt} onChange={(event) => updateField("inspectedAt", event.target.value)} id="inspectedAt" name="inspectedAt" type="datetime-local" required /></div></div><div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"><Button disabled={gpsState === "loading"} onClick={captureLocation} type="button" variant="outline"><LocateFixed aria-hidden="true" />{gpsState === "loading" ? "Mengambil lokasi…" : "Ambil lokasi saya"}</Button>{gps ? <p className="text-xs text-muted-foreground"><MapPin aria-hidden="true" className="mr-1 inline size-3" />{gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)} · akurasi ±{Math.round(gps.accuracy)} m</p> : <p className="text-xs text-muted-foreground">Belum ada titik GPS.</p>}</div></section>
    <section className={step === 1 ? "space-y-4" : "hidden"}><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Kondisi lapangan</p><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="excavatorCount">Excavator terpantau</Label><Input value={fields.excavatorCount} onChange={(event) => updateField("excavatorCount", event.target.value)} id="excavatorCount" min="0" name="excavatorCount" type="number" required /></div><div className="space-y-2"><Label htmlFor="workerCount">Pekerja terpantau</Label><Input value={fields.workerCount} onChange={(event) => updateField("workerCount", event.target.value)} id="workerCount" min="0" name="workerCount" type="number" required /></div></div><div className="space-y-2"><Label htmlFor="condition">Kondisi</Label><Textarea value={fields.condition} onChange={(event) => updateField("condition", event.target.value)} id="condition" name="condition" required maxLength={5000} placeholder="Jelaskan kondisi operasional saat ini." /></div><div className="space-y-2"><Label htmlFor="findings">Temuan</Label><Textarea value={fields.findings} onChange={(event) => updateField("findings", event.target.value)} id="findings" name="findings" maxLength={10000} /></div><div className="space-y-2"><Label htmlFor="notes">Catatan</Label><Textarea value={fields.notes} onChange={(event) => updateField("notes", event.target.value)} id="notes" name="notes" maxLength={10000} /></div></section>
    <section className={step === 2 ? "space-y-4" : "hidden"}><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Foto inspeksi</p><p className="mt-1 text-sm text-muted-foreground">Maksimal 3 foto. Foto diperkecil ke sisi maksimal 1600px dan dikompresi sebelum unggah.</p></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-xs font-semibold uppercase tracking-wider hover:bg-muted"><Camera aria-hidden="true" />{isOptimizing ? "Mengoptimalkan foto…" : "Tambah foto"}<input accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={isOptimizing || photos.length >= 3} onChange={(event) => void selectPhotos(event)} type="file" /></label>{photos.length ? <div className="grid gap-4 sm:grid-cols-3">{photos.map((photo, index) => <div className="rounded-xl border border-border bg-card p-2" key={`${photo.file.name}-${index}`}><img alt={`Foto inspeksi ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" loading="lazy" src={photo.preview} /><div className="mt-2 flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{photo.originalName}</p><p className="text-[10px] text-muted-foreground">{Math.round(photo.originalSize / 1024)} KB → {Math.round(photo.file.size / 1024)} KB</p></div><Button onClick={() => removePhoto(index)} size="xs" type="button" variant="ghost">Hapus</Button></div></div>)}</div> : <p className="text-xs text-muted-foreground">Belum ada foto.</p>}</section>
    <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur"><Button disabled={isPending || step === 0} onClick={() => setStep((current) => current - 1)} type="button" variant="ghost">Sebelumnya</Button>{step < STEPS.length - 1 ? <Button disabled={isPending} onClick={() => setStep((current) => current + 1)} type="button" variant="outline">Berikutnya</Button> : null}<Button disabled={isPending} onClick={saveDraftNow} type="button" variant="outline"><Save aria-hidden="true" />Simpan draf lokal</Button><Button disabled={isPending} onClick={discardDraft} type="button" variant="ghost"><Trash2 aria-hidden="true" />Hapus draf lokal</Button><Button disabled={isPending} type="submit"><Upload aria-hidden="true" />{isPending ? progress ?? "Menyimpan…" : syncState === "unsynced" || syncState === "failed" ? "Coba kirim lagi" : "Kirim inspeksi"}</Button>{isPending ? <p className="text-xs text-muted-foreground">Jangan tutup halaman sampai unggahan selesai.</p> : null}</div>
  </form></CardContent></Card>;
}
