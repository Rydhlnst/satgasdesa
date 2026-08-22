import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return <main className="mx-auto min-w-0 w-full max-w-[1440px] overflow-x-clip px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 md:pb-10 lg:px-10">{children}</main>;
}
