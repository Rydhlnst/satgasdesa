import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { AppProviders } from "@/components/providers";

const jakartaSans = localFont({
  src: "../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: "SATGAS DESA SEJOLI",
  description: "Internal SATGAS DESA SEJOLI operations system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`h-full antialiased font-sans ${jakartaSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col"><AppProviders><ServiceWorkerRegister />{children}</AppProviders></body>
    </html>
  );
}
