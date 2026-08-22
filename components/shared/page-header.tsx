import Link from "next/link";
import { Fragment, type ReactNode } from "react";
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
    <header className="space-y-3 border-b border-border pb-4 md:space-y-4 md:pb-6">
      {breadcrumbs?.length ? (
        <Breadcrumb className="hidden md:block">
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <Fragment key={`${item.label}-${index}`}>
                <BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && item.href ? <BreadcrumbLink asChild><Link href={item.href}>{getUiLabel(item.label)}</Link></BreadcrumbLink> : <BreadcrumbPage>{getUiLabel(item.label)}</BreadcrumbPage>}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-5">
        <div>
          {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.2em]">{getUiLabel(eyebrow)}</p> : null}
          <h1 className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl md:mt-2 md:text-3xl">{getUiLabel(title)}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground md:mt-2 md:text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
