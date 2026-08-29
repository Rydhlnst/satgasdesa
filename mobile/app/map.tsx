import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Filter, List, LocateFixed, MapPinned, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Camera, Map as MapLibreView, Marker } from "@maplibre/maplibre-react-native";
import type { CameraRef, LngLat } from "@maplibre/maplibre-react-native";

import { useAuth } from "../src/auth";
import { BottomNav, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { SearchField } from "../src/components/MobilePrimitives";
import { Modal as GModal, ModalBackdrop, ModalContent } from "../src/components/ui/modal";
import { getBlocks } from "../src/lib/api";
import { colors, spacing } from "../src/theme";
import type { Block } from "../src/types";

type MapStatus = "ALL" | "ACTIVE" | "STOPPED" | "NOT_OPERATING";
type LocationState = "idle" | "loading" | "ready" | "denied" | "error";

const DEFAULT_CENTER: LngLat = [106.816, -6.2];
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();
const MAP_STYLE_URL = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(MAPTILER_API_KEY)}`
  : null;

export default function MapScreen() {
  const { role } = useAuth();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const fittedFilterRef = useRef<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MapStatus>("ALL");
  const [priority, setPriority] = useState("ALL");
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapInstance, setMapInstance] = useState(0);
  const [deviceLocation, setDeviceLocation] = useState<Location.LocationObject | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");

  const query = useQuery({
    queryKey: ["map-blocks", search, status, priority],
    queryFn: () => getBlocks(search || undefined, status === "ALL" ? undefined : status, { priority: priority === "ALL" ? undefined : priority }),
    enabled: Boolean(role),
  });
  const blocks = useMemo(() => query.data?.blocks ?? [], [query.data?.blocks]);
  const visibleBlocks = useMemo(
    () => blocks.filter((item) => {
      const matchesSearch = !search.trim() || `${item.code} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase());
      return matchesSearch && (status === "ALL" || item.status === status);
    }),
    [blocks, search, status],
  );
  const mapBlocks = useMemo(
    () => visibleBlocks.flatMap((item) => {
      const longitude = Number(item.longitude);
      const latitude = Number(item.latitude);
      return Number.isFinite(longitude) && Number.isFinite(latitude) ? [{ item: item as Block, coordinate: [longitude, latitude] as LngLat }] : [];
    }),
    [visibleBlocks],
  );
  const counts = {
    active: blocks.filter((item) => item.status === "ACTIVE").length,
    stopped: blocks.filter((item) => item.status === "STOPPED").length,
    notOperating: blocks.filter((item) => item.status === "NOT_OPERATING").length,
  };
  const initialCenter = mapBlocks[0]?.coordinate ?? DEFAULT_CENTER;
  const filterKey = `${search}|${status}|${priority}`;

  const requestDeviceLocation = useCallback(async () => {
    setLocationState("loading");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationState("denied");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLocation(current);
      setLocationState("ready");
      cameraRef.current?.flyTo({ center: [current.coords.longitude, current.coords.latitude], zoom: 14, duration: 500 });
    } catch {
      setLocationState("error");
    }
  }, []);

  useEffect(() => {
    if (!mapReady || query.isFetching || !mapBlocks.length || fittedFilterRef.current === filterKey) return;
    fittedFilterRef.current = filterKey;
    if (mapBlocks.length === 1) {
      cameraRef.current?.flyTo({ center: mapBlocks[0].coordinate, zoom: 13, duration: 450 });
      return;
    }
    const longitudes = mapBlocks.map(({ coordinate }) => coordinate[0]);
    const latitudes = mapBlocks.map(({ coordinate }) => coordinate[1]);
    cameraRef.current?.fitBounds(
      [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)],
      { padding: { top: 48, right: 36, bottom: 110, left: 36 }, duration: 450 },
    );
  }, [filterKey, mapBlocks, mapReady, query.isFetching]);

  const focusBlock = (item: (typeof mapBlocks)[number]) => {
    setSelectedBlock(item.item);
    cameraRef.current?.flyTo({ center: item.coordinate, zoom: 14, duration: 450 });
  };

  const focusDevice = () => {
    if (deviceLocation) {
      cameraRef.current?.flyTo({ center: [deviceLocation.coords.longitude, deviceLocation.coords.latitude], zoom: 14, duration: 500 });
      return;
    }
    void requestDeviceLocation();
  };

  if (!role) return null;

  return <>
    <Header role={role} title="Peta Blok" subtitle="Persebaran blok operasional" />
    <Screen>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Peta Blok</Text>
          <Text style={styles.subtitle}>{blocks.length} blok terdaftar</Text>
        </View>
        <Pressable onPress={() => router.push("/monitoring")} style={styles.smallButton}>
          <List color={colors.text} size={15} />
          <Text style={styles.smallButtonText}>List</Text>
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <SearchField value={search} onChangeText={setSearch} onClear={() => setSearch("")} placeholder="Cari blok..." />
        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterButton}>
          <Filter color={colors.primary} size={17} />
          <Text style={styles.filterText}>Filter</Text>
        </Pressable>
      </View>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Lokasi blok tidak dapat dimuat." onRetry={() => query.refetch()} /> : <>
        {!MAP_STYLE_URL ? <MapConfigurationState /> : <View style={styles.map}>
          <MapLibreView
            key={mapInstance}
            attribution
            attributionPosition={{ bottom: 8, right: 8 }}
            compass
            compassPosition={{ top: 12, right: 12 }}
            logo={false}
            mapStyle={MAP_STYLE_URL}
            onDidFailLoadingMap={() => setMapError(true)}
            onDidFinishLoadingMap={() => { setMapError(false); setMapReady(true); }}
            scaleBar
            scaleBarPosition={{ top: 12, left: 12 }}
            style={StyleSheet.absoluteFill}
          >
            <Camera ref={cameraRef} initialViewState={{ center: initialCenter, zoom: 11 }} minZoom={4} maxZoom={19} />
            {deviceLocation ? <Marker id="device-location" lngLat={[deviceLocation.coords.longitude, deviceLocation.coords.latitude]}>
              <View style={styles.deviceMarker}>
                <LocateFixed color="#FFFFFF" size={17} />
              </View>
            </Marker> : null}
            {mapBlocks.map(({ item, coordinate }) => <Marker key={item.id} id={item.id} lngLat={coordinate} anchor="bottom" onPress={() => focusBlock({ item, coordinate })}>
              <View style={[styles.blockMarker, { backgroundColor: markerColor(item.status) }]}>
                <MapPinned color="#FFFFFF" size={16} />
              </View>
            </Marker>)}
          </MapLibreView>
          <View style={styles.mapControls}>
            <Pressable accessibilityLabel="Use my location" accessibilityRole="button" disabled={locationState === "loading"} onPress={focusDevice} style={styles.mapControl}>
              <LocateFixed color={colors.primary} size={18} />
            </Pressable>
          </View>
          {mapError ? <View style={styles.mapError}>
            <Text style={styles.mapErrorTitle}>Peta tidak dapat dimuat</Text>
            <Text style={styles.mapErrorText}>Periksa MapTiler API key dan koneksi internet.</Text>
            <Pressable onPress={() => { setMapError(false); setMapReady(false); setMapInstance((value) => value + 1); }} style={styles.mapRetry}>
              <Text style={styles.mapRetryText}>Coba lagi</Text>
            </Pressable>
          </View> : null}
          {!mapBlocks.length ? <View style={styles.emptyMap}>
            <MapPinned color={colors.primary} size={22} />
            <Text style={styles.emptyMapTitle}>Belum ada koordinat blok</Text>
            <Text style={styles.emptyMapText}>Tambahkan lokasi blok untuk menampilkannya di peta.</Text>
          </View> : null}
          {selectedBlock ? <Pressable onPress={() => router.push(`/blocks/${selectedBlock.id}`)} style={styles.selectedBlock}>
            <View style={styles.selectedBlockCopy}>
              <Text style={styles.selectedBlockEyebrow}>{selectedBlock.code}</Text>
              <Text numberOfLines={1} style={styles.selectedBlockTitle}>{selectedBlock.name}</Text>
              <Text numberOfLines={1} style={styles.selectedBlockMeta}>{selectedBlock.operationalCondition} · {selectedBlock.workerCount} pekerja</Text>
            </View>
            <Text style={styles.selectedBlockAction}>Detail</Text>
          </Pressable> : null}
        </View>}
        {locationState === "denied" ? <Text style={styles.locationNotice}>Izin lokasi tidak diberikan. Peta tetap dapat digunakan tanpa lokasi perangkat.</Text> : null}
        {locationState === "error" ? <Text style={styles.locationNotice}>Lokasi perangkat tidak tersedia saat ini.</Text> : null}
        <View style={styles.legend}>
          <Legend color={colors.success} label="Aktif" value={counts.active} />
          <Legend color={colors.danger} label="Berhenti" value={counts.stopped} />
          <Legend color={colors.textMuted} label="Belum Operasi" value={counts.notOperating} />
        </View>
      </>}
    </Screen>
    <BottomNav current="monitoring" role={role} />
    <GModal isOpen={filterOpen} onClose={() => setFilterOpen(false)} size="full">
      <ModalBackdrop />
      <ModalContent className="mt-auto min-h-[320px] w-full rounded-t-3xl rounded-b-none bg-white p-5 pb-safe">
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter Blok</Text>
            <Pressable accessibilityLabel="Tutup filter" accessibilityRole="button" onPress={() => setFilterOpen(false)}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>
          <Text style={styles.sheetLabel}>Status Blok</Text>
          {(["ALL", "ACTIVE", "STOPPED", "NOT_OPERATING"] as MapStatus[]).map((value) => <Pressable key={value} onPress={() => setStatus(value)} style={[styles.option, status === value && styles.optionActive]}>
            <Text style={[styles.optionText, status === value && styles.optionTextActive]}>{value === "ALL" ? "Semua Status" : value === "ACTIVE" ? "Aktif" : value === "STOPPED" ? "Berhenti" : "Belum Operasi"}</Text>
          </Pressable>)}
          <Text style={styles.sheetLabel}>Prioritas</Text>
          {["ALL", "LOW", "NORMAL", "HIGH", "CRITICAL"].map((value) => <Pressable key={value} onPress={() => setPriority(value)} style={[styles.option, priority === value && styles.optionActive]}>
            <Text style={[styles.optionText, priority === value && styles.optionTextActive]}>{value === "ALL" ? "Semua Prioritas" : value}</Text>
          </Pressable>)}
          <Pressable onPress={() => setFilterOpen(false)} style={styles.apply}><Text style={styles.applyText}>Terapkan Filter</Text></Pressable>
      </ModalContent>
    </GModal>
  </>;
}

function markerColor(status: string) {
  return status === "STOPPED" ? colors.danger : status === "NOT_OPERATING" ? colors.textMuted : colors.success;
}

function MapConfigurationState() {
  return <View style={[styles.map, styles.mapMessage]}>
    <MapPinned color={colors.primary} size={28} />
    <Text style={styles.mapMessageTitle}>Peta belum dikonfigurasi</Text>
    <Text style={styles.mapMessageText}>Tambahkan EXPO_PUBLIC_MAPTILER_API_KEY sebelum membuat build aplikasi.</Text>
  </View>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <View><Text style={styles.legendLabel}>{label}</Text><Text style={styles.legendValue}>{value}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 17, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  smallButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 9, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 11, paddingVertical: 8 },
  smallButtonText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  searchRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, flex: 1, height: 42, paddingHorizontal: 12 },
  filterButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 5, height: 42, paddingHorizontal: 11 },
  filterText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  map: { borderColor: colors.border, borderRadius: 16, borderWidth: 1, height: 430, overflow: "hidden", position: "relative" },
  mapMessage: { alignItems: "center", backgroundColor: colors.surface, justifyContent: "center", padding: spacing.xl },
  mapMessageTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: spacing.sm },
  mapMessageText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5, textAlign: "center" },
  mapControls: { position: "absolute", right: 12, top: 60 },
  mapControl: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 10, elevation: 3, height: 40, justifyContent: "center", shadowColor: "#000000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.14, shadowRadius: 4, width: 40 },
  blockMarker: { alignItems: "center", borderColor: "#FFFFFF", borderRadius: 20, borderWidth: 2, elevation: 4, height: 36, justifyContent: "center", shadowColor: "#000000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.22, shadowRadius: 3, width: 36 },
  deviceMarker: { alignItems: "center", backgroundColor: colors.primary, borderColor: "#FFFFFF", borderRadius: 18, borderWidth: 2, elevation: 4, height: 34, justifyContent: "center", shadowColor: "#000000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.22, shadowRadius: 3, width: 34 },
  mapError: { alignItems: "center", backgroundColor: "#FFFFFFF2", borderRadius: 12, left: 24, padding: spacing.md, position: "absolute", right: 24, top: 130 },
  mapErrorTitle: { color: colors.danger, fontSize: 13, fontWeight: "900" },
  mapErrorText: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  mapRetry: { backgroundColor: colors.primary, borderRadius: 8, marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 8 },
  mapRetryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  emptyMap: { alignItems: "center", backgroundColor: "#FFFFFFE8", borderRadius: 12, left: 30, padding: spacing.md, position: "absolute", right: 30, top: 150 },
  emptyMapTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 },
  emptyMapText: { color: colors.textMuted, fontSize: 10, marginTop: 3, textAlign: "center" },
  selectedBlock: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, bottom: 12, elevation: 4, flexDirection: "row", left: 12, padding: spacing.sm, position: "absolute", right: 12, shadowColor: "#000000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.12, shadowRadius: 4 },
  selectedBlockCopy: { flex: 1, minWidth: 0 },
  selectedBlockEyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  selectedBlockTitle: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 2 },
  selectedBlockMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  selectedBlockAction: { color: colors.primary, fontSize: 11, fontWeight: "900", marginLeft: spacing.sm },
  locationNotice: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: -2 },
  legend: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
  legendItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: 5 },
  dot: { borderRadius: 5, height: 10, width: 10 },
  legendLabel: { color: colors.textMuted, fontSize: 9 },
  legendValue: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 2 },
  modalBackdrop: { backgroundColor: "#00000066", flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: spacing.sm, padding: spacing.lg },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  sheetLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  option: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, padding: spacing.md },
  optionActive: { backgroundColor: "#EAF1FF", borderColor: colors.primary },
  optionText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  optionTextActive: { color: colors.primary },
  apply: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, marginTop: spacing.sm, padding: spacing.md },
  applyText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
});
