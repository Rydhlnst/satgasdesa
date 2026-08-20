import Link from "next/link";
import type { ReactNode } from "react";
import { getUiLabel } from "@/src/lib/ui-labels";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type PageHeaderBreadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="space-y-4 border-b border-border pb-6">
      {breadcrumbs?.length ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <BreadcrumbItem key={`${item.label}-${index}`}>
                {index < breadcrumbs.length - 1 && item.href ? (
                  <>
                    <BreadcrumbLink asChild><Link href={item.href}>{getUiLabel(item.label)}</Link></BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                ) : <BreadcrumbPage>{getUiLabel(item.label)}</BreadcrumbPage>}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{getUiLabel(eyebrow)}</p> : null}
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{getUiLabel(title)}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
