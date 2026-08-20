import type { ReactNode } from "react";

export type ResponsiveDataViewProps<T> = {
  rows: T[];
  getRowKey: (row: T) => string;
  desktop: (row: T) => ReactNode;
  mobile: (row: T) => ReactNode;
  desktopHeader: ReactNode;
  empty?: ReactNode;
};

export function ResponsiveDataView<T>({ rows, getRowKey, desktop, mobile, desktopHeader, empty }: ResponsiveDataViewProps<T>) {
  if (!rows.length && empty) return empty;
  return <><section className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground"><tr>{desktopHeader}</tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={getRowKey(row)}>{desktop(row)}</tr>)}</tbody></table></section><section className="space-y-3 md:hidden">{rows.map((row) => <article key={getRowKey(row)}>{mobile(row)}</article>)}</section></>;
}
