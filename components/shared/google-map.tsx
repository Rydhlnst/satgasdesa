"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPinned } from "lucide-react";

export type GoogleMapMarker = {
  id: string;
  label: string;
  latitude: number | string;
  longitude: number | string;
  status?: string;
};

type GoogleCoordinate = { lat: number; lng: number };
type GoogleMapOptions = { center: GoogleCoordinate; zoom: number; mapTypeControl: boolean; streetViewControl: boolean; fullscreenControl: boolean };
type GoogleMarkerOptions = { map: GoogleMapInstance; position: GoogleCoordinate; title: string; label?: string };
type GoogleMapInstance = { setCenter: (center: GoogleCoordinate) => void };
type GoogleMarkerInstance = { setMap: (map: GoogleMapInstance | null) => void };
type GoogleMapsApi = { maps: { Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMapInstance; Marker: new (options: GoogleMarkerOptions) => GoogleMarkerInstance } };

declare global {
  interface Window { google?: GoogleMapsApi; }
}

type GoogleMapProps = {
  latitude: number | string;
  longitude: number | string;
  title?: string;
  description?: string;
  heightClassName?: string;
  markers?: GoogleMapMarker[];
};

function coordinate(value: number | string): string {
  return Number(value).toFixed(7);
}

export function GoogleMap({
  latitude,
  longitude,
  title = "Google Maps",
  description = "Lokasi tersimpan dari data operasional.",
  heightClassName = "h-72",
  markers = [],
}: GoogleMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<GoogleMarkerInstance[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState(false);
  const lat = coordinate(latitude);
  const lng = coordinate(longitude);
  const query = `${lat},${lng}`;
  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const src = embedKey
    ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(embedKey)}&center=${lat},${lng}&zoom=13&maptype=roadmap`
    : `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed`;

  useEffect(() => {
    if (!apiKey || !mapElementRef.current) return;
    const initialise = () => {
      if (!window.google || !mapElementRef.current) return;
      const map = new window.google.maps.Map(mapElementRef.current, { center: { lat: Number(latitude), lng: Number(longitude) }, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = markers.map((marker) => new window.google!.maps.Marker({ map, position: { lat: Number(marker.latitude), lng: Number(marker.longitude) }, title: `${marker.label}${marker.status ? ` · ${marker.status}` : ""}`, label: marker.label }));
      setApiLoaded(true);
    };
    if (window.google) {
      initialise();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener("load", initialise);
      return () => existing.removeEventListener("load", initialise);
    }
    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.addEventListener("load", initialise);
    script.addEventListener("error", () => setApiError(true));
    document.head.appendChild(script);
    return () => script.removeEventListener("load", initialise);
  }, [apiKey, latitude, longitude, markers]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_18px_50px_-30px_rgba(15,35,75,0.55)] ring-1 ring-foreground/5">
      <div className="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPinned aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-bold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <a
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
          rel="noreferrer"
          target="_blank"
        >
          Buka
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </div>
      <div className={`relative overflow-hidden bg-muted ${heightClassName}`}>
        {apiKey && !apiError ? <div ref={mapElementRef} className="size-full" aria-label={`${title} with ${markers.length} markers`} /> : <iframe allowFullScreen className="size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={src} title={`${title} — ${query}`} />}
        {apiKey && !apiLoaded && !apiError ? <div className="absolute inset-0 grid place-items-center bg-background/80 text-xs font-semibold text-muted-foreground backdrop-blur-sm">Memuat Google Maps…</div> : null}
      </div>
      <p className="border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
        Koordinat {lat}, {lng}{markers.length ? ` · ${markers.length} lokasi blok` : ""}
      </p>
    </section>
  );
}
