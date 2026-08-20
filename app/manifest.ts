import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { id: "/dashboard", name: "SATGAS DESA SEJOLI", short_name: "SATGAS", description: "Sistem operasional internal SATGAS DESA SEJOLI", start_url: "/dashboard", scope: "/", lang: "id", display: "standalone", orientation: "portrait-primary", background_color: "#f7f8fa", theme_color: "#111827", categories: ["business", "productivity"], icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon", purpose: "maskable" }] };
}
