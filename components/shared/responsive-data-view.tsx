import type { ReactNode } from "react";
import { EmptyState, NoResultsState } from "@/components/shared/ui-state";

export type ResponsiveDataViewProps<T> = {
  rows: T[];
  getRowKey: (row: T) => string;
  desktop: (row: T) => ReactNode;
  mobile: (row: T) => ReactNode;
  desktopHeader: ReactNode;
  empty?: ReactNode;
  emptyKind?: "empty" | "no-results";
};

export function ResponsiveDataView<T>({ rows, getRowKey, desktop, mobile, desktopHeader, empty, emptyKind = "empty" }: ResponsiveDataViewProps<T>) {
  if (!rows.length) return <>{empty ?? <section className="rounded-2xl border border-border bg-card">{emptyKind === "no-results" ? <NoResultsState variant="inline" /> : <EmptyState variant="inline" />}</section>}</>;
  return <><section className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground"><tr>{desktopHeader}</tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={getRowKey(row)}>{desktop(row)}</tr>)}</tbody></table></section><section className="space-y-3 md:hidden">{rows.map((row) => <article className="rounded-xl border border-border bg-card p-4 shadow-sm" key={getRowKey(row)}>{mobile(row)}</article>)}</section></>;
}
