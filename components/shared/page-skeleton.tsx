import { PageContainer } from "@/components/app-shell/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export type PageSkeletonVariant = "dashboard" | "list" | "table" | "detail" | "form";

type PageSkeletonProps = { variant?: PageSkeletonVariant };

function HeaderSkeleton() {
  return <div className="space-y-4 border-b border-border pb-6"><Skeleton className="h-3 w-24" /><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-3"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-full max-w-xl" /></div><Skeleton className="h-10 w-32" /></div></div>;
}

function MetricSkeletons() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="rounded-xl border border-border bg-card p-5" key={index}><div className="flex items-start justify-between gap-4"><Skeleton className="h-3 w-24" /><Skeleton className="size-9 rounded-lg" /></div><Skeleton className="mt-6 h-8 w-28" /><Skeleton className="mt-3 h-3 w-36" /></div>)}</div>;
}

function TableSkeleton() {
  return <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><Skeleton className="h-5 w-36" /><Skeleton className="h-9 w-28" /></div><div className="divide-y divide-border">{Array.from({ length: 6 }, (_, index) => <div className="grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center" key={index}><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-20" /></div>)}</div></div>;
}

function ListSkeleton() {
  return <div className="space-y-4"><div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-24" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div className="rounded-xl border border-border bg-card p-5" key={index}><div className="flex items-start justify-between"><Skeleton className="size-10 rounded-lg" /><Skeleton className="h-5 w-16" /></div><Skeleton className="mt-6 h-5 w-40" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-2 h-4 w-2/3" /><Skeleton className="mt-6 h-9 w-28" /></div>)}</div></div>;
}

function DetailSkeleton() {
  return <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]"><div className="space-y-6 rounded-xl border border-border bg-card p-6"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-72" /><div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div className="space-y-2" key={index}><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-full" /></div>)}</div></div><div className="space-y-4 rounded-xl border border-border bg-card p-6"><Skeleton className="h-5 w-32" /><Skeleton className="h-28 w-full" /><Skeleton className="h-10 w-full" /></div></div>;
}

function FormSkeleton() {
  return <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]"><div className="space-y-6 rounded-xl border border-border bg-card p-6">{Array.from({ length: 6 }, (_, index) => <div className="space-y-2" key={index}><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-full" /></div>)}<div className="flex justify-end gap-3"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-28" /></div></div><div className="space-y-4 rounded-xl border border-border bg-card p-6"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-24 w-full" /></div></div>;
}

export function PageSkeleton({ variant = "list" }: PageSkeletonProps) {
  return <PageContainer><div aria-busy="true" aria-label="Memuat data" className="space-y-8" role="status"><span className="sr-only">Memuat data</span><HeaderSkeleton />{variant === "dashboard" ? <><MetricSkeletons /><div className="grid gap-6 lg:grid-cols-2"><div className="h-72 rounded-xl border border-border bg-card p-6"><Skeleton className="h-5 w-40" /><Skeleton className="mt-6 h-44 w-full" /></div><div className="h-72 rounded-xl border border-border bg-card p-6"><Skeleton className="h-5 w-40" /><div className="mt-6 space-y-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-8 w-full" key={index} />)}</div></div></div></> : null}{variant === "list" ? <ListSkeleton /> : null}{variant === "table" ? <TableSkeleton /> : null}{variant === "detail" ? <DetailSkeleton /> : null}{variant === "form" ? <FormSkeleton /> : null}</div></PageContainer>;
}
