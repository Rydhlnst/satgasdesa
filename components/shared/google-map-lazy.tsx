"use client";

import dynamic from "next/dynamic";

import { LoadingState } from "@/components/shared/ui-state";
import type { GoogleMapMarker } from "@/components/shared/google-map";

const GoogleMap = dynamic(() => import("@/components/shared/google-map").then((module) => module.GoogleMap), {
  loading: () => <LoadingState description="Peta Google Maps sedang disiapkan." title="Memuat peta" variant="inline" />,
  ssr: false,
});

export function LazyGoogleMap(props: { latitude: number | string; longitude: number | string; markers: GoogleMapMarker[]; title: string; description?: string; heightClassName?: string }) {
  return <GoogleMap {...props} />;
}
