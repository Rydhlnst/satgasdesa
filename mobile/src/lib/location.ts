import * as Location from "expo-location";

export async function getCurrentLocation(purpose: string): Promise<Location.LocationObject> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(`Izin lokasi diperlukan untuk ${purpose}. Aktifkan izin lokasi di Pengaturan, lalu coba lagi.`);
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error(`Layanan lokasi perangkat mati. Aktifkan GPS untuk ${purpose}, lalu coba lagi.`);
  }
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    throw new Error(`Lokasi perangkat belum tersedia untuk ${purpose}. Pastikan GPS aktif dan coba lagi.`);
  }
}
